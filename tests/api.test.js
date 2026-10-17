/**
 * 爱教学 Sprint1 API 集成测试
 * 运行方式：npm test
 * 说明：测试会自动在 3100 端口拉起服务，跑完后自动关闭。
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
let serverProc = null;

function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      fetch(`${BASE}/api/stats`)
        .then(r => (r.ok ? resolve() : setTimeout(tryOnce, 200)))
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error('服务启动超时'));
          else setTimeout(tryOnce, 200);
        });
    };
    tryOnce();
  });
}

async function getJson(url) {
  const res = await fetch(BASE + url);
  return { status: res.status, body: await res.json() };
}

before(async () => {
  serverProc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });
  await waitForServer();
});

after(() => {
  if (serverProc) serverProc.kill();
});

test('GET /api/stats 返回合并统计', async () => {
  const { status, body } = await getJson('/api/stats');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.code, 0);
  assert.strictEqual(body.data.courseCount, 12);
  assert.strictEqual(body.data.teacherCount, 7);
  assert.strictEqual(typeof body.data.studentTotal, 'number');
  assert.strictEqual(typeof body.data.hoursTotal, 'number');
});

test('GET /api/courses 默认分页返回 total/page/pageSize', async () => {
  const { status, body } = await getJson('/api/courses');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.code, 0);
  assert.strictEqual(body.total, 12);
  assert.strictEqual(body.page, 1);
  assert.strictEqual(body.pageSize, 50);
  assert.ok(Array.isArray(body.data));
  assert.strictEqual(body.data.length, 12);
});

test('GET /api/courses 分页切片正确', async () => {
  const { body } = await getJson('/api/courses?page=2&pageSize=5');
  assert.strictEqual(body.page, 2);
  assert.strictEqual(body.pageSize, 5);
  assert.strictEqual(body.data.length, 5);
  assert.strictEqual(body.total, 12);
});

test('GET /api/courses 搜索通配符 % 被转义，不误匹配全表', async () => {
  const { body } = await getJson('/api/courses?keyword=' + encodeURIComponent('%'));
  assert.strictEqual(body.code, 0);
  assert.strictEqual(body.total, 0);
});

test('GET /api/courses 关键字搜索命中', async () => {
  const { body } = await getJson('/api/courses?keyword=' + encodeURIComponent('数据结构'));
  assert.ok(body.total >= 1);
  assert.ok(body.data.some(c => c.name.includes('数据结构')));
});

test('GET /api/courses 按教研室筛选', async () => {
  const { body } = await getJson('/api/courses?department=' + encodeURIComponent('软件工程教研室'));
  assert.ok(body.total > 0);
  assert.ok(body.data.every(c => c.department === '软件工程教研室'));
});

test('GET /api/courses 按教师筛选', async () => {
  const { body } = await getJson('/api/courses?teacherId=T001');
  assert.strictEqual(body.total, 2);
  assert.ok(body.data.every(c => c.teacherId === 'T001'));
});

test('GET /api/courses/:id 返回课程详情', async () => {
  const { status, body } = await getJson('/api/courses/C001');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.code, 'SE101');
  assert.strictEqual(body.data.teacher, '张明');
});

test('GET /api/courses/:id 不存在返回 404', async () => {
  const { status, body } = await getJson('/api/courses/NOPE');
  assert.strictEqual(status, 404);
  assert.strictEqual(body.code, 404);
});

test('GET /api/teachers 返回 7 位教师', async () => {
  const { body } = await getJson('/api/teachers');
  assert.strictEqual(body.data.length, 7);
});

test('GET /api/teachers/:id/stats 教师维度统计', async () => {
  const { body } = await getJson('/api/teachers/T001/stats');
  assert.strictEqual(body.data.courseCount, 2);
  assert.strictEqual(body.data.studentTotal, 175);
  assert.strictEqual(body.data.hoursTotal, 112);
});

test('GET /api/filter-options 包含全部筛选维度', async () => {
  const { body } = await getJson('/api/filter-options');
  assert.ok(body.data.semesters.length >= 2);
  assert.ok(body.data.colleges.length >= 3);
  assert.ok(body.data.departments.length >= 6);
  assert.ok(body.data.categories.includes('必修'));
  assert.ok(body.data.categories.includes('选修'));
});

test('GET / 首页可访问', async () => {
  const res = await fetch(BASE + '/');
  assert.strictEqual(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('爱教学'));
});
