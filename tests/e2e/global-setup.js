/**
 * Playwright globalSetup：
 * 启动独立临时数据库 + 独立 Express 服务，将 baseURL 和清理信息写入 JSON 文件
 * 供用例读取 baseURL，供 globalTeardown kill 子进程 + 清理临时目录
 */
const path = require('path');
const fs = require('fs');
const { startTestServer } = require('../helpers/test-server');

const STATE_FILE = path.join(__dirname, '..', '..', '.playwright', 'server-info.json');

module.exports = async function globalSetup() {
  const server = await startTestServer();

  process.env.E2E_BASE_URL = server.base;

  // 确保目录存在
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 写清理信息：PID + tempDir + dbPath + baseURL
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    baseURL: server.base,
    pid: server.proc ? server.proc.pid : null,
    tempDir: server.tempDir,
    dbPath: server.dbPath,
  }, null, 2));
};
