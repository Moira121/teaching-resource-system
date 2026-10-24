/**
 * Sprint3 教学评价管理测试：
 * 用户故事1 督导查阅历史评价（只读）
 * 用户故事2 主任导出课程评价汇总简表（CSV）
 * 用户故事3 主任统计各课程资源数量
 * 用户故事4 教师查看本人课程评价统计分数
 * 每用例独立临时库 + 独立服务进程，串行执行（package.json --test-concurrency=1）。
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { startTestServer } = require('./helpers/test-server');

let env;
let supervisor, director, teacherT001;

before(async () => {
  env = await startTestServer();
  supervisor = (await env.login('supervisor')).token;
  director = (await env.login('director')).token;
  teacherT001 = (await env.login('teacher', 'T001')).token;
});

after(async () => { await env.stop(); });

/* ---------- 用户故事1：督导查看课程历史教学评价记录 ---------- */

test('督导查询评价记录：返回全部种子评价（36 条）', async () => {
  const { status, body } = await env.request('/api/evaluations', { token: supervisor });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.code, 0);
  assert.strictEqual(body.total, 36);
  assert.ok(body.data[0].courseName);
  assert.ok(['学生', '督导', '同行'].includes(body.data[0].evaluatorRole));
});

test('督导按 courseId 过滤：只返回该课程评价', async () => {
  const { status, body } = await env.request('/api/evaluations?courseId=C001', { token: supervisor });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.total, 5);
  assert.ok(body.data.every(e => e.courseId === 'C001'));
});

test('督导按学期+评价者角色组合过滤', async () => {
  const { status, body } = await env.request('/api/evaluations?semester=2025-2026-1&evaluatorRole=督导', { token: supervisor });
  assert.strictEqual(status, 200);
  assert.ok(body.total > 0);
  assert.ok(body.data.every(e => e.semester === '2025-2026-1' && e.evaluatorRole === '督导'));
});

test('督导无任何写操作入口：POST /api/evaluations 不存在（404）', async () => {
  const { status } = await env.request('/api/evaluations', {
    method: 'POST', token: supervisor,
    body: { courseId: 'C001', score: 90 }
  });
  assert.strictEqual(status, 404);
});

test('未登录访问评价列表：401', async () => {
  const { status } = await env.request('/api/evaluations');
  assert.strictEqual(status, 401);
});

/* ---------- 用户故事2：主任导出课程评价汇总简表 ---------- */

test('主任导出 CSV：200 + text/csv + BOM + 表头 + 12 行课程', async () => {
  const res = await fetch(`${env.base}/api/evaluations/export`, {
    headers: { Authorization: `Bearer ${director}` }
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="evaluation-summary-/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.deepStrictEqual([...buf.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'CSV 应以 UTF-8 BOM 开头');
  const text = buf.toString('utf8').slice(1);
  const lines = text.split('\r\n');
  assert.strictEqual(lines[0], '课程代码,课程名称,授课教师,学期,学院,评价条数,平均分,学生均分,督导均分,同行均分');
  assert.strictEqual(lines.length - 1, 12, '12 门课程各一行');
});

test('主任导出带学期过滤：只含该学期课程', async () => {
  const res = await fetch(`${env.base}/api/evaluations/export?semester=2025-2026-1`, {
    headers: { Authorization: `Bearer ${director}` }
  });
  const text = await res.text(); // fetch text() 解码自动剥离 BOM，无需手动 slice
  const lines = text.split('\r\n');
  assert.strictEqual(lines.length - 1, 9, '2025-2026-1 学期 9 门课程');
  assert.ok(lines.every((l, i) => i === 0 || l.includes('2025-2026-1')));
});

test('主任导出非法入参：semester 格式错误 → 400', async () => {
  const { status, body } = await env.request('/api/evaluations/export?semester=abc', { token: director });
  assert.strictEqual(status, 400);
  assert.match(body.message, /semester/);
});

test('主任导出非法入参：courseId 含注入字符 → 400', async () => {
  const { status } = await env.request("/api/evaluations/export?courseId=C001'OR'1'='1", { token: director });
  assert.strictEqual(status, 400);
});

test('督导/教师导出：403 权限拒绝', async () => {
  const r1 = await env.request('/api/evaluations/export', { token: supervisor });
  assert.strictEqual(r1.status, 403);
  const r2 = await env.request('/api/evaluations/export', { token: teacherT001 });
  assert.strictEqual(r2.status, 403);
});

/* ---------- 用户故事3：主任统计各课程资源数量 ---------- */

test('主任课程资源统计：200 + C001 有 3 条资源', async () => {
  const { status, body } = await env.request('/api/stats/course-resources', { token: director });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.length, 12);
  const c001 = body.data.find(r => r.courseId === 'C001');
  assert.strictEqual(c001.resourceCount, 3);
  // 排序约定：resourceCount 降序
  assert.ok(body.data[0].resourceCount >= body.data[body.data.length - 1].resourceCount);
});

test('督导/教师访问课程资源统计：403', async () => {
  const r1 = await env.request('/api/stats/course-resources', { token: supervisor });
  assert.strictEqual(r1.status, 403);
  const r2 = await env.request('/api/stats/course-resources', { token: teacherT001 });
  assert.strictEqual(r2.status, 403);
});

/* ---------- 用户故事4：教师查看本人课程评价统计 ---------- */

test('教师查看本人评价统计：200 + 只含 T001 的课程', async () => {
  const { status, body } = await env.request('/api/teachers/T001/evaluation-stats', { token: teacherT001 });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.teacherId, 'T001');
  assert.strictEqual(body.data.overall.evalCount, 9);
  assert.ok(body.data.byCourse.every(c => ['C001', 'C002'].includes(c.courseId)));
  const c001 = body.data.byCourse.find(c => c.courseId === 'C001');
  assert.strictEqual(c001.evalCount, 5);
  assert.strictEqual(typeof c001.avgScore, 'number');
});

test('教师查看他人评价统计：403 越权拦截', async () => {
  const { status } = await env.request('/api/teachers/T002/evaluation-stats', { token: teacherT001 });
  assert.strictEqual(status, 403);
});

test('教师伪造 teacherId 查询评价列表：服务端强制本人', async () => {
  const { status, body } = await env.request('/api/evaluations?teacherId=T002', { token: teacherT001 });
  assert.strictEqual(status, 200);
  assert.ok(body.data.every(e => e.teacherId === 'T001'), '返回结果必须全部是本人评价');
});

test('主任查看任意教师评价统计：200', async () => {
  const { status, body } = await env.request('/api/teachers/T006/evaluation-stats', { token: director });
  assert.strictEqual(status, 200);
  assert.ok(body.data.byCourse.every(c => ['C008', 'C012'].includes(c.courseId)));
});

test('评价统计：不存在教师 404 / 非法 id 400', async () => {
  const r1 = await env.request('/api/teachers/T999/evaluation-stats', { token: director });
  assert.strictEqual(r1.status, 404);
  const r2 = await env.request('/api/teachers/bad%20id/evaluation-stats', { token: director });
  assert.strictEqual(r2.status, 400);
});

test('评价列表非法入参：evaluatorRole 枚举外 → 400', async () => {
  const { status } = await env.request('/api/evaluations?evaluatorRole=家长', { token: supervisor });
  assert.strictEqual(status, 400);
});
