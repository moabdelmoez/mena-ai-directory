import { test, expect, Page } from '@playwright/test';

// Use a test company created via admin API to avoid coupling to seed data.
// Falls back to 'core42' if running against a seeded database.
const TEST_PREFIX = '[E2E-DETAIL]';
let testSlug: string;
let testCompanyId: string | null = null;

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', process.env.ADMIN_EMAIL!);
  await page.fill('#password', process.env.ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin');
}

test.describe('Company Detail Page', () => {
  test.beforeAll(async ({ browser }) => {
    // Create a test company via admin API for detail page tests
    const page = await browser.newPage();
    try {
      await loginAsAdmin(page);

      await page.goto('/admin/manage');
      await page.waitForLoadState('networkidle');

      const companyName = `${TEST_PREFIX} Detail Co ${Date.now()}`;
      await page.fill('#name', companyName);
      await page.fill('#website', 'https://e2e-detail-test.example.com');
      await page.fill('#description', 'A test AI company for E2E detail page testing. Provides AI infrastructure and machine learning services.');
      await page.selectOption('#hq_country', 'United Arab Emirates');

      // Add a product
      await page.click('button:has-text("Add Product")');
      await page.fill('input[placeholder="Product name"]', 'Detail Test Product');
      await page.fill('textarea[placeholder="Product description"]', 'An AI product for testing the detail page.');
      await page.click('button:has-text("Add"):not(:has-text("Add Product"))');

      await page.click('button:has-text("Create Company")');
      await page.waitForURL('/admin/companies', { timeout: 30000 });

      // Find the created company to get its slug and ID
      await page.fill('input[placeholder="Search companies..."]', companyName);
      await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

      const row = page.locator('tr', { hasText: companyName }).first();
      const editLink = row.locator('a:has-text("Edit")').first();
      const href = await editLink.getAttribute('href');
      const idMatch = href?.match(/id=([a-f0-9-]+)/);
      testCompanyId = idMatch ? idMatch[1] : null;

      // Get slug from the view link
      const viewLink = row.locator('a[href^="/company/"]').first();
      const viewHref = await viewLink.getAttribute('href');
      testSlug = viewHref?.replace('/company/', '') || '';
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!testCompanyId) return;
    const page = await browser.newPage();
    try {
      await loginAsAdmin(page);
      await page.goto(`/admin/manage?id=${testCompanyId}`);
      await page.waitForLoadState('networkidle');

      page.on('dialog', dialog => dialog.accept());
      const deleteButton = page.locator('button:has-text("Delete Company")');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForURL('/admin/companies', { timeout: 10000 });
      }
    } catch {
      // Company may already be deleted
    } finally {
      await page.close();
    }
  });

  test('displays company info', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Verify company name is visible
    await expect(page.locator('h1').first()).toBeVisible();

    // Verify description is present (company header card)
    await expect(page.locator('p.text-gray-600').first()).toBeVisible();
  });

  test('displays products section', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Verify Products & Services heading
    await expect(page.locator('h2:has-text("Products & Services")')).toBeVisible();
  });

  test('breadcrumb navigation to search', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Click Companies breadcrumb
    await page.click('a:has-text("Companies")');

    // Verify navigation to search page
    await expect(page).toHaveURL('/search');
  });

  test('breadcrumb navigation to home', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Click Home breadcrumb
    await page.click('nav a:has-text("Home")');

    // Verify navigation to home page
    await expect(page).toHaveURL('/');
  });

  test('displays reviews section', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Verify Reviews heading is displayed
    await expect(page.locator('h2:has-text("Reviews")')).toBeVisible();
  });

  test('displays country information', async ({ page }) => {
    await page.goto(`/company/${testSlug}`);

    // Verify country information is displayed
    await expect(page.locator('span.text-gray-500:has-text("United Arab Emirates")')).toBeVisible();
  });

  test('error for non-existent company', async ({ page }) => {
    const response = await page.goto('/company/non-existent-company-xyz');

    // Page should show an error status (404 or 500)
    const status = response?.status();
    expect(status === 404 || status === 500).toBeTruthy();
  });
});
