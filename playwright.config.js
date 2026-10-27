// Playwright E2E 测试配置
// - globalSetup 起独立临时 DB + 独立 Express 服务（复用 tests/helpers/test-server.js 模式）
// - 串行执行（workers=1），与 API 测试保持一致，规避 better-sqlite3 句柄冲突
// - 不合并到 npm test，单独用 npm run test:e2e 触发
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  workers: 1, // 串行，避免 SQLite 句柄并发问题
  reporter: 'list',

  // globalSetup 启动服务并设置 E2E_BASE_URL 环境变量，globalTeardown 清理
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',

  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
