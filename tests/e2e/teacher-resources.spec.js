/**
 * E2E 测试：教师本人课程资源 CRUD 闭环
 * 覆盖：登录教师 T001 → 打开 C001 详情 → 新增资源 → 修改 → 删除
 * 验证：UI 表单提交 + 服务端持久化 + 列表刷新
 * 注意：所有 E2E 用例共用 globalSetup 启动的同一个服务器+DB，
 *       所以断言使用相对计数（initialCount ± delta）而非硬编码，避免测试间状态污染
 */
const { test, expect } = require('@playwright/test');

test.describe('教师资源 CRUD', () => {

  // 登录 T001 张明（C001 + C002 两门课），为每个用例前的公共准备
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('.role-option[data-role="teacher"]');
    await page.selectOption('#teacherSelect', { index: 1 }); // T001 张明
    await page.click('#loginBtn');
    await page.waitForURL('**/teacher.html');
  });

  test('查看本人课程资源列表', async ({ page }) => {
    // 点击 C001 详情（第一门课）
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('#detailModal')).toHaveClass(/show/);
    await expect(page.locator('.resource-title')).toContainText('教学资源');

    // 等待资源加载
    await expect(page.locator('.res-item').first()).toBeVisible();
    const initialCount = await page.locator('.res-item').count();
    expect(initialCount).toBeGreaterThanOrEqual(3); // C001 种子至少 3 条

    await expect(page.locator('.res-type-tag').first()).toContainText(/课件|文档|视频/);
  });

  test('新增教学资源 → 列表刷新 → 持久化', async ({ page }) => {
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('.res-item').first()).toBeVisible();
    const initialCount = await page.locator('.res-item').count();

    const testName = 'E2E测试资源-' + Date.now();
    await page.fill('#resName', testName);
    await page.selectOption('#resType', '课件');
    await page.fill('#resUrl', 'https://example.com/e2e-test');
    await page.fill('#resDesc', 'E2E 自动化测试新增');
    await page.click('#resSubmitBtn');

    // 新增后 +1
    await expect(page.locator('.res-item')).toHaveCount(initialCount + 1);
    await expect(page.locator('.res-name').first()).toContainText(testName);

    // 关闭再打开，验证持久化
    await page.click('#modalClose');
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('.res-item')).toHaveCount(initialCount + 1);
    await expect(page.locator('.res-name').first()).toContainText(testName);
  });

  test('修改已有教学资源 → 列表同步更新', async ({ page }) => {
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('.res-item').first()).toBeVisible();
    const initialCount = await page.locator('.res-item').count();

    // 点编辑
    await page.locator('.res-edit-btn').first().click();
    await expect(page.locator('#resFormTitle')).toContainText('编辑');

    await page.fill('#resDesc', 'E2E 修改测试-' + Date.now());
    await page.click('#resSubmitBtn');

    // 修改条数不变
    await expect(page.locator('.res-item')).toHaveCount(initialCount);
    await expect(page.locator('.res-desc').first()).toContainText('E2E 修改测试');
  });

  test('删除教学资源 → 列表减少', async ({ page }) => {
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('.res-item').first()).toBeVisible();
    const initialCount = await page.locator('.res-item').count();

    page.once('dialog', d => d.accept());
    await page.locator('.res-delete-btn').first().click();

    await expect(page.locator('.res-item')).toHaveCount(initialCount - 1);
  });

  test('必填校验：缺少资源名称提交被拦截', async ({ page }) => {
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('.res-item').first()).toBeVisible();
    const initialCount = await page.locator('.res-item').count();

    // 只填 URL，不填名称
    await page.fill('#resUrl', 'https://example.com/no-name');
    await page.click('#resSubmitBtn');

    // 被 HTML5 required 拦截，数量不变
    await expect(page.locator('.res-item')).toHaveCount(initialCount);
  });
});
