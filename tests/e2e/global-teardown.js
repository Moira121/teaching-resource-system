/**
 * Playwright globalTeardown：
 * 读取 server-info.json，kill 子进程，清理临时目录
 */
const path = require('path');
const fs = require('fs');

const STATE_FILE = path.join(__dirname, '..', '..', '.playwright', 'server-info.json');

module.exports = async function globalTeardown() {
  if (!fs.existsSync(STATE_FILE)) return;

  let info;
  try {
    info = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (_err) {
    return;
  }

  // Kill 子进程
  if (info.pid) {
    try {
      process.kill(info.pid, 'SIGTERM');
    } catch (_e) { /* 进程可能已退出 */ }
    // 等一下让进程退出
    await new Promise(r => setTimeout(r, 300));
  }

  // 清理临时目录
  if (info.tempDir) {
    try { fs.rmSync(info.tempDir, { recursive: true, force: true }); } catch (_e) { /* Windows 句柄延迟 */ }
  }

  // 删除状态文件
  try { fs.unlinkSync(STATE_FILE); } catch (_e) { /* 文件可能已删除 */ }
};
