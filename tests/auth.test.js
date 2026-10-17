/**
 * Sprint2 鉴权与权限矩阵测试（每用例独立数据库 + 独立服务，串行执行）
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { startTestServer } = require('./helpers/test-server');

let env;
beforeEach(async () => { env = await startTestServer(); });
afterEach(async () => { await env.stop(); });

test('鉴权: 未携带 token 访问课程列表返回 401', async () => {
  const { status, body } = await env.request('/api/courses');
  assert.strictEqual(status, 401);
  assert.strictEqual(body.code, 401);
});

test('鉴权: 伪造 token 返回 401', async () => {
  const { status } = await env.request('/api/courses', { token: 'fake.payload.sig' });
  assert.strictEqual(status, 401);
});

test('鉴权: 篡改签名的 token 返回 401', async () => {
  const login = await env.login('director');
  const tampered = login.token.slice(0, -2) + 'AA';
  const { status } = await env.request('/api/courses', { token: tampered });
  assert.strictEqual(status, 401);
});

test('登录: 非法角色返回 400', async () => {
  const { status, body } = await env.request('/api/auth/login', {
    method: 'POST', body: { role: 'hacker' }
  });
  assert.strictEqual(status, 400);
  assert.strictEqual(body.code, 400);
});

test('登录: 教师角色未提供 teacherId 返回 400', async () => {
  const { status } = await env.request('/api/auth/login', {
    method: 'POST', body: { role: 'teacher' }
  });
  assert.strictEqual(status, 400);
});

test('登录: 教师角色使用不存在的 teacherId 返回 400', async () => {
  const { status } = await env.request('/api/auth/login', {
    method: 'POST', body: { role: 'teacher', teacherId: 'T999' }
  });
  assert.strictEqual(status, 400);
});

test('鉴权: 三种合法角色均可登录成功并下发 token', async () => {
  const director = await env.login('director');
  const supervisor = await env.login('supervisor');
  const teacher = await env.login('teacher', 'T001');
  assert.strictEqual(director.status, 200);
  assert.strictEqual(supervisor.status, 200);
  assert.strictEqual(teacher.status, 200);
  assert.ok(director.token && supervisor.token && teacher.token);
});

test('权限: 教师无权访问教师列表（仅主任/督导）返回 403', async () => {
  const t = await env.login('teacher', 'T001');
  const { status } = await env.request('/api/teachers', { token: t.token });
  assert.strictEqual(status, 403);
});

test('权限: 教师仅能查看本人课程详情，他人课程返回 403', async () => {
  const t = await env.login('teacher', 'T002'); // C001 属于 T001
  const { status } = await env.request('/api/courses/C001', { token: t.token });
  assert.strictEqual(status, 403);
  const own = await env.request('/api/courses/C003', { token: t.token }); // C003 属于 T002
  assert.strictEqual(own.status, 200);
});

test('权限: 教师课程列表被服务端强制限定为本人（伪造 teacherId 无效）', async () => {
  const t = await env.login('teacher', 'T002');
  const { body } = await env.request('/api/courses?teacherId=T001', { token: t.token });
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every(c => c.teacherId === 'T002'));
});

test('权限: 教师仅能查看本人统计，他人统计返回 403', async () => {
  const t = await env.login('teacher', 'T002');
  const deny = await env.request('/api/teachers/T001/stats', { token: t.token });
  assert.strictEqual(deny.status, 403);
  const ok = await env.request('/api/teachers/T002/stats', { token: t.token });
  assert.strictEqual(ok.status, 200);
});

test('权限: 全院统计仅主任/督导可见，教师返回 403', async () => {
  const t = await env.login('teacher', 'T001');
  assert.strictEqual((await env.request('/api/stats', { token: t.token })).status, 403);
  const s = await env.login('supervisor');
  assert.strictEqual((await env.request('/api/stats', { token: s.token })).status, 200);
});

test('权限: 督导禁止写操作，POST 资源返回 403', async () => {
  const s = await env.login('supervisor');
  const { status } = await env.request('/api/courses/C001/resources', {
    method: 'POST', token: s.token,
    body: { name: 'x', type: '链接', url: 'https://example.com/a' }
  });
  assert.strictEqual(status, 403);
});
