/**
 * Sprint1 课程查询回归测试（Sprint2 鉴权化后全部保持通过）
 * 覆盖：分页/搜索转义/组合筛选/统计聚合/404/入参校验/静态首页
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { startTestServer } = require('./helpers/test-server');

let env, token;
beforeEach(async () => {
  env = await startTestServer();
  token = (await env.login('director')).token;
});
afterEach(async () => { await env.stop(); });

test('回归: GET /api/stats 返回合并统计（12 课程 / 7 教师）', async () => {
  const { status, body } = await env.request('/api/stats', { token });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.courseCount, 12);
  assert.strictEqual(body.data.teacherCount, 7);
  assert.strictEqual(body.data.studentTotal, 958);
  assert.strictEqual(body.data.hoursTotal, 528);
});

test('回归: 课程默认分页返回 total/page/pageSize', async () => {
  const { body } = await env.request('/api/courses', { token });
  assert.strictEqual(body.total, 12);
  assert.strictEqual(body.page, 1);
  assert.strictEqual(body.pageSize, 50);
  assert.strictEqual(body.data.length, 12);
});

test('回归: page=2&pageSize=5 分页切片正确', async () => {
  const { body } = await env.request('/api/courses?page=2&pageSize=5', { token });
  assert.strictEqual(body.page, 2);
  assert.strictEqual(body.pageSize, 5);
  assert.strictEqual(body.data.length, 5);
});

test('入参: pageSize 超过上限被钳制为 200', async () => {
  const { body } = await env.request('/api/courses?pageSize=9999', { token });
  assert.strictEqual(body.pageSize, 200);
});

test('入参: page 非数字时回退为第 1 页', async () => {
  const { body } = await env.request('/api/courses?page=abc', { token });
  assert.strictEqual(body.page, 1);
});

test('回归: 搜索通配符 % 被转义，keyword=% 返回 0 条', async () => {
  const { body } = await env.request('/api/courses?keyword=' + encodeURIComponent('%'), { token });
  assert.strictEqual(body.total, 0);
});

test('回归: 搜索通配符 _ 被转义，不误匹配', async () => {
  const { body } = await env.request('/api/courses?keyword=' + encodeURIComponent('_'), { token });
  assert.strictEqual(body.total, 0);
});

test('回归: 关键字"数据结构"命中课程', async () => {
  const { body } = await env.request('/api/courses?keyword=' + encodeURIComponent('数据结构'), { token });
  assert.ok(body.total >= 1);
  assert.ok(body.data.some(c => c.name.includes('数据结构')));
});

test('回归: 按教研室筛选，结果全部属于该教研室', async () => {
  const { body } = await env.request('/api/courses?department=' + encodeURIComponent('软件工程教研室'), { token });
  assert.ok(body.total > 0);
  assert.ok(body.data.every(c => c.department === '软件工程教研室'));
});

test('回归: 按 teacherId=T001 筛选返回 2 门课', async () => {
  const { body } = await env.request('/api/courses?teacherId=T001', { token });
  assert.strictEqual(body.total, 2);
  assert.ok(body.data.every(c => c.teacherId === 'T001'));
});

test('Sprint2 故事: 主任按学期+学院组合筛选', async () => {
  const qs = 'semester=' + encodeURIComponent('2025-2026-2') +
             '&college=' + encodeURIComponent('软件学院');
  const { body } = await env.request('/api/courses?' + qs, { token });
  assert.ok(body.total >= 1);
  assert.ok(body.data.every(c => c.semester === '2025-2026-2' && c.college === '软件学院'));
});

test('回归: 课程详情 C001 字段完整', async () => {
  const { status, body } = await env.request('/api/courses/C001', { token });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.code, 'SE101');
  assert.strictEqual(body.data.teacher, '张明');
});

test('回归: 不存在的课程返回 404 而非崩溃', async () => {
  const { status, body } = await env.request('/api/courses/NOPE', { token });
  assert.strictEqual(status, 404);
  assert.strictEqual(body.code, 404);
});

test('回归: 非法 id 格式返回 400', async () => {
  const { status } = await env.request('/api/courses/' + encodeURIComponent('../etc'), { token });
  assert.strictEqual(status, 400);
});

test('回归: GET /api/teachers 返回 7 位教师', async () => {
  const { body } = await env.request('/api/teachers', { token });
  assert.strictEqual(body.data.length, 7);
});

test('回归: T001 教师维度统计（2 门 / 175 人次 / 112 学时）', async () => {
  const { body } = await env.request('/api/teachers/T001/stats', { token });
  assert.strictEqual(body.data.courseCount, 2);
  assert.strictEqual(body.data.studentTotal, 175);
  assert.strictEqual(body.data.hoursTotal, 112);
});

test('回归: filter-options 含学期/学院/教研室/类别四维度', async () => {
  const { body } = await env.request('/api/filter-options', { token });
  assert.ok(body.data.semesters.length >= 2);
  assert.ok(body.data.colleges.length >= 3);
  assert.ok(body.data.departments.length >= 6);
  assert.ok(body.data.categories.includes('必修'));
  assert.ok(body.data.categories.includes('选修'));
});

test('回归: 静态首页无需鉴权即可访问', async () => {
  const res = await fetch(env.base + '/');
  assert.strictEqual(res.status, 200);
  assert.ok((await res.text()).includes('爱教学'));
});

test('入参: 超长 keyword 返回 400', async () => {
  const { status } = await env.request('/api/courses?keyword=' + 'a'.repeat(120), { token });
  assert.strictEqual(status, 400);
});
