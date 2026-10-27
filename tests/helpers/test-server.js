/**
 * 测试服务助手：
 * - 每个用例独立创建临时数据库（建表+种子）、独立拉起 server 进程、结束后销毁
 * - 配合 `node --test --no-concurrency` 串行执行，
 *   彻底规避 better-sqlite3 原生句柄跨用例复用引发的随机 SIGSEGV
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const { initDatabase, removeDbFiles } = require('../../scripts/db-init');

const PORT = 4321;
const SERVER_PATH = path.join(__dirname, '..', '..', 'server.js');
let seq = 0;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** 探测端口是否已可连接（服务已起） */
function waitPortReady(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.createConnection({ port: PORT, host: '127.0.0.1' });
      sock.once('connect', () => { sock.end(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error('测试服务启动超时'));
        else setTimeout(tryOnce, 100);
      });
    };
    tryOnce();
  });
}

/** 启动一套全新的隔离测试环境，返回 { base, stop, login, request } */
async function startTestServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajx-s2-'));
  const dbPath = path.join(dir, `case-${++seq}.db`);

  // 建库句柄在用例进程内关闭后，再交由独立 server 进程打开，避免句柄共享
  const initDb = initDatabase(dbPath);
  initDb.close();

  const proc = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath, AUTH_SECRET: 'test-secret' },
    stdio: 'ignore'
  });

  let exited = false;
  proc.on('exit', () => { exited = true; });
  await waitPortReady();

  const base = `http://127.0.0.1:${PORT}`;

  /** 登录换取 token；返回 { status, token, headers } */
  async function login(role, teacherId) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, teacherId })
    });
    const json = await res.json();
    const token = json.data && json.data.token;
    return {
      status: res.status,
      body: json,
      token,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    };
  }

  /** 带鉴权的请求封装 */
  async function request(url, { method = 'GET', token, body, headers = {} } = {}) {
    const opt = { method, headers: { ...headers } };
    if (token) opt.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) {
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    const res = await fetch(base + url, opt);
    let json = null;
    try { json = await res.json(); } catch (_) { json = null; }
    return { status: res.status, body: json };
  }

  /** 停止服务并销毁本用例的数据库文件 */
  async function stop() {
    if (!exited) {
      proc.kill();
      await new Promise(r => proc.on('exit', r));
    }
    await sleep(50); // 等待原生句柄完全释放
    try {
      removeDbFiles(dbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) { /* Windows 偶发句柄延迟，忽略 */ }
  }

  return { base, stop, login, request, proc, tempDir: dir, dbPath };
}

module.exports = { startTestServer };
