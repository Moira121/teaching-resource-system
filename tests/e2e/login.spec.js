/**
 * E2E 测试：三角色 UI 登录流程
 * 覆盖：主任直接登录 → 首页跳转、教师选身份登录 → 本人课程页、督导直接登录 → 听课查询页
 * 前置：globalSetup 已起好临时 DB + 服务（端口 4321）
 */
const { test, expect } = require('@playwright/test');

test.describe('登录流程', () => {

  test('主任角色登录 → 进入课程统筹管理页', async ({ page }) => {
    await page.goto('/');

    // 选择主任角色
    await page.click('.role-option[data-role="director"]');
    await expect(page.locator('#loginBtn')).toBeEnabled();

    // 点击进入系统
    await page.click('#loginBtn');
    await page.waitForURL('**/director.html');

    // 验证主任页特征元素
    await expect(page.locator('.logo')).toContainText('课程统筹管理');
    await expect(page.locator('.role-tag')).toContainText('教研室主任');
    // 全院统计数据应该有值
    await expect(page.locator('.stat-value').first()).toBeVisible();
  });

  test('教师角色登录 → 必须选身份 → 进入本人课程页', async ({ page }) => {
    await page.goto('/');

    // 选教师角色 → 出现身份下拉
    await page.click('.role-option[data-role="teacher"]');
    await expect(page.locator('#teacherSelectArea')).toHaveClass(/show/);
    // 未选身份时登录按钮禁用
    await expect(page.locator('#loginBtn')).toBeDisabled();

    // 选择第一位教师（T001 张明）
    await page.selectOption('#teacherSelect', { index: 1 }); // 跳过 "请选择教师" placeholder
    await expect(page.locator('#loginBtn')).toBeEnabled();

    await page.click('#loginBtn');
    await page.waitForURL('**/teacher.html');

    // 验证教师页特征
    await expect(page.locator('.logo')).toContainText('我的课程');
    // T001 张明应该看到自己的 2 门课程
    await expect(page.locator('#resultCount')).toContainText('共 2 门课程');
    // 评价统计也应该加载
    await expect(page.locator('#evalStatsRow .stat-value').first()).toBeVisible();
  });

  test('督导角色登录 → 进入听课查询页', async ({ page }) => {
    await page.goto('/');

    await page.click('.role-option[data-role="supervisor"]');
    await expect(page.locator('#loginBtn')).toBeEnabled();

    await page.click('#loginBtn');
    await page.waitForURL('**/supervisor.html');

    await expect(page.locator('.logo')).toContainText('教学督导');
    await expect(page.locator('.role-tag')).toContainText('教学督导');
    // 督导能看到评价记录区域
    await expect(page.locator('.toolbar-title').filter({ hasText: '历史教学评价' })).toBeVisible();
  });

  test('教师切换身份后登录页正确重置', async ({ page }) => {
    await page.goto('/');

    // 先选教师、选身份
    await page.click('.role-option[data-role="teacher"]');
    await page.selectOption('#teacherSelect', { index: 2 });
    await expect(page.locator('#loginBtn')).toBeEnabled();

    // 再切到督导
    await page.click('.role-option[data-role="supervisor"]');
    await expect(page.locator('#teacherSelectArea')).not.toHaveClass(/show/);
    await expect(page.locator('#loginBtn')).toBeEnabled();
  });
});
