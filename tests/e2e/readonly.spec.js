/**
 * E2E 测试：只读权限验证
 * 覆盖：督导/主任查看资源时 UI 无写操作入口；教师登录后看不到他人课程
 * 这是 UI 端的权限呈现验证，配合 API 层的 69 条集成测试做双重保障
 * 注意：主任/督导的课程列表按学期倒序排列，第一门可能没有资源种子。
 *       所以这里显式选择 C001（软件工程导论，有 3 条种子资源）的详情按钮
 */
const { test, expect } = require('@playwright/test');

test.describe('只读权限', () => {

  test('督导登录 → 查看资源弹窗 → 无编辑/删除/新增按钮', async ({ page }) => {
    // 督导登录
    await page.goto('/');
    await page.click('.role-option[data-role="supervisor"]');
    await page.click('#loginBtn');
    await page.waitForURL('**/supervisor.html');

    // 找到 C001 的详情按钮（显式定位，不依赖排序）
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('#detailModal')).toHaveClass(/show/);

    // 资源列表正常显示（C001 有 3 条种子资源）
    await expect(page.locator('.res-item')).toHaveCount(3);

    // ❌ 不应出现编辑/删除/新增
    await expect(page.locator('.res-edit-btn')).toHaveCount(0);
    await expect(page.locator('.res-delete-btn')).toHaveCount(0);
    await expect(page.locator('.res-form')).toHaveCount(0);
  });

  test('主任登录 → 查看资源弹窗 → 无写操作入口', async ({ page }) => {
    await page.goto('/');
    await page.click('.role-option[data-role="director"]');
    await page.click('#loginBtn');
    await page.waitForURL('**/director.html');

    // 主任全院 12 门，显式点 C001
    await page.locator('.view-btn[data-id="C001"]').click();
    await expect(page.locator('#detailModal')).toHaveClass(/show/);
    await expect(page.locator('.res-item')).toHaveCount(3);

    await expect(page.locator('.res-edit-btn')).toHaveCount(0);
    await expect(page.locator('.res-delete-btn')).toHaveCount(0);
    await expect(page.locator('.res-form')).toHaveCount(0);
  });

  test('教师登录 → 只能看到本人课程（服务端强制）', async ({ page }) => {
    await page.goto('/');
    await page.click('.role-option[data-role="teacher"]');
    await page.selectOption('#teacherSelect', { index: 1 }); // T001 张明
    await page.click('#loginBtn');
    await page.waitForURL('**/teacher.html');

    // T001 只有 2 门课程（C001 + C002），不可能看到全院 12 门
    await expect(page.locator('#resultCount')).toContainText('共 2 门课程');

    const rows = page.locator('#tableBody tr');
    const firstCode = await rows.first().locator('td').nth(0).textContent();
    expect(firstCode).toBe('SE101'); // C001 code SE101
  });

  test('主任页面 → 导出 CSV 按钮可见', async ({ page }) => {
    await page.goto('/');
    await page.click('.role-option[data-role="director"]');
    await page.click('#loginBtn');
    await page.waitForURL('**/director.html');

    await expect(page.locator('#exportEvalBtn')).toBeVisible();
    await expect(page.locator('#exportEvalBtn')).toContainText('导出 CSV');
  });

  test('督导页面 → 评价记录查询区可见', async ({ page }) => {
    await page.goto('/');
    await page.click('.role-option[data-role="supervisor"]');
    await page.click('#loginBtn');
    await page.waitForURL('**/supervisor.html');

    await expect(page.locator('#evalCount')).toContainText(/共 \d+ 条评价/);
  });
});
