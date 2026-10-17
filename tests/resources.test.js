/**
 * Sprint2 教学资源模块测试
 * 权限矩阵：
 *  - 教师：仅可查看/增改删本人授课课程的资源
 *  - 督导：只读浏览任意课程资源，禁止写操作
 *  - 主任：只读浏览任意课程资源
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { startTestServer } = require('./helpers/test-server');

let env;
const validBody = { name: '新增课件.pptx', type: '课件', url: 'https://res.example.com/new.pptx', description: '测试' };

beforeEach(async () => { env = await startTestServer(); });
afterEach(async () => { await env.stop(); });

test('Must 故事: 教师查看本课程(C001)教学资源列表', async () => {
  const t = await env.login('teacher', 'T001'); // C001 属于 T001
  const { status, body } = await env.request('/api/courses/C001/resources', { token: t.token });
  assert.strictEqual(status, 200);
  assert.ok(body.data.length >= 3); // 种子中 C001 有 R001-R003
  assert.ok(body.data.every(r => r.courseId === 'C001'));
  assert.ok(body.data[0].url && body.data[0].type);
});

test('Should 故事: 教学督导只读浏览课程配套资源', async () => {
  const s = await env.login('supervisor');
  const { status, body } = await env.request('/api/courses/C002/resources', { token: s.token });
  assert.strictEqual(status, 200);
  assert.ok(body.data.some(r => r.name.includes('数据结构')));
});

test('Should 故事: 教研室主任浏览课程配套资源', async () => {
  const d = await env.login('director');
  const { status, body } = await env.request('/api/courses/C006/resources', { token: d.token });
  assert.strictEqual(status, 200);
  assert.ok(body.data.length >= 1);
});

test('权限: 教师查看他人课程资源返回 403', async () => {
  const t = await env.login('teacher', 'T002'); // C001 属于 T001
  const { status } = await env.request('/api/courses/C001/resources', { token: t.token });
  assert.strictEqual(status, 403);
});

test('边界: 查询不存在课程的资源返回 404', async () => {
  const d = await env.login('director');
  const { status } = await env.request('/api/courses/C999/resources', { token: d.token });
  assert.strictEqual(status, 404);
});

test('写操作: 教师为本人课程新增资源成功 201', async () => {
  const t = await env.login('teacher', 'T001');
  const { status, body } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: t.token, body: validBody
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(body.data.name, validBody.name);
  assert.strictEqual(body.data.courseId, 'C001');
  assert.ok(body.data.id);
});

test('Must 闭环: 新增资源后列表数量增加且新资源可见', async () => {
  const t = await env.login('teacher', 'T001');
  const before = (await env.request('/api/courses/C001/resources', { token: t.token })).body.data.length;
  await env.request('/api/courses/C001/resources', { method: 'POST', token: t.token, body: validBody });
  const after = await env.request('/api/courses/C001/resources', { token: t.token });
  assert.strictEqual(after.body.data.length, before + 1);
  assert.ok(after.body.data.some(r => r.name === validBody.name));
});

test('入参校验: 缺少资源名称返回 400', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: t.token,
    body: { type: '课件', url: 'https://res.example.com/a' }
  });
  assert.strictEqual(status, 400);
});

test('入参校验: 非法资源类型返回 400', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: t.token,
    body: { name: 'x', type: '病毒', url: 'https://res.example.com/a' }
  });
  assert.strictEqual(status, 400);
});

test('入参校验: 非 http/https 链接返回 400', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: t.token,
    body: { name: 'x', type: '链接', url: 'javascript:alert(1)' }
  });
  assert.strictEqual(status, 400);
});

test('权限: 督导新增资源返回 403（只读）', async () => {
  const s = await env.login('supervisor');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: s.token, body: validBody
  });
  assert.strictEqual(status, 403);
});

test('权限: 主任新增资源返回 403（Sprint2 仅教师可写）', async () => {
  const d = await env.login('director');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: d.token, body: validBody
  });
  assert.strictEqual(status, 403);
});

test('权限: 教师为他人课程新增资源返回 403', async () => {
  const t = await env.login('teacher', 'T002');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: t.token, body: validBody
  });
  assert.strictEqual(status, 403);
});

test('写操作: 教师更新本人资源成功（R004 属于 C002/T001）', async () => {
  const t = await env.login('teacher', 'T001');
  const { status, body } = await env.request('/api/resources/R004', {
    method: 'PUT', token: t.token,
    body: { name: '数据结构-大纲v2.pdf', type: '文档', url: 'https://res.example.com/v2.pdf', description: '修订' }
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.name, '数据结构-大纲v2.pdf');
});

test('权限: 教师更新他人资源返回 403（R001 属于 T001，T002 操作）', async () => {
  const t = await env.login('teacher', 'T002');
  const { status } = await env.request('/api/resources/R001', {
    method: 'PUT', token: t.token, body: validBody
  });
  assert.strictEqual(status, 403);
});

test('写操作: 教师删除本人资源成功', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/resources/R001', {
    method: 'DELETE', token: t.token
  });
  assert.strictEqual(status, 200);
  const list = await env.request('/api/courses/C001/resources', { token: t.token });
  assert.ok(!list.body.data.some(r => r.id === 'R001'));
});

test('权限: 教师删除他人资源返回 403', async () => {
  const t = await env.login('teacher', 'T002');
  const { status } = await env.request('/api/resources/R001', {
    method: 'DELETE', token: t.token
  });
  assert.strictEqual(status, 403);
});

test('边界: 更新不存在资源返回 404', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/resources/R-NOPE', {
    method: 'PUT', token: t.token, body: validBody
  });
  assert.strictEqual(status, 404);
});

test('边界: 删除不存在资源返回 404', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/resources/R-NOPE', {
    method: 'DELETE', token: t.token
  });
  assert.strictEqual(status, 404);
});
