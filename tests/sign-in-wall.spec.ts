import { test, expect } from '@playwright/test';

test.describe('Anonymous browsing (SEO-open pages)', () => {
  test('country landing page renders without redirect', async ({ page }) => {
    await page.goto('/ai-companies/uae');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/ai-companies/uae');
    expect(page.url()).not.toContain('/signin');
    await expect(page.locator('h1')).toContainText(/AI Companies in/i);
  });

  test('category landing page renders without redirect', async ({ page }) => {
    await page.goto('/ai-companies/category/ai-agents');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/ai-companies/category/ai-agents');
    expect(page.url()).not.toContain('/signin');
  });

  test('company detail page renders without redirect', async ({ page }) => {
    await page.goto('/search?q=AI');
    await page.waitForLoadState('networkidle');
    const firstCompanyLink = page.locator('a[href^="/company/"]').first();
    const companyHref = await firstCompanyLink.getAttribute('href');
    if (!companyHref) test.skip(true, 'No companies available to test');
    await page.goto(companyHref!);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/company/');
    expect(page.url()).not.toContain('/signin');
  });

  test('search page renders all results without blur', async ({ page }) => {
    await page.goto('/search?q=AI');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a:has-text("Get full access — sign in for free")')).toHaveCount(0);
    await expect(page.locator('[aria-hidden="true"].blur-sm')).toHaveCount(0);
  });
});

test.describe('Action gates (anonymous user)', () => {
  test('Request Info redirects to sign-in', async ({ page }) => {
    await page.goto('/search?q=AI');
    await page.waitForLoadState('networkidle');
    const firstCompanyLink = page.locator('a[href^="/company/"]').first();
    const companyHref = await firstCompanyLink.getAttribute('href');
    if (!companyHref) test.skip(true, 'No companies available to test');
    await page.goto(companyHref!);
    await page.waitForLoadState('networkidle');
    const button = page.locator('button:has-text("Request Info")');
    if (await button.count() === 0) test.skip(true, 'No Request Info button on this profile');
    await button.first().click();
    await page.waitForURL(/\/signin/);
    expect(page.url()).toContain('after_auth_return_to');
    expect(page.url()).toContain(encodeURIComponent(companyHref!));
  });

  test('Leave a review CTA links to sign-in', async ({ page }) => {
    await page.goto('/search?q=AI');
    await page.waitForLoadState('networkidle');
    const firstCompanyLink = page.locator('a[href^="/company/"]').first();
    const companyHref = await firstCompanyLink.getAttribute('href');
    if (!companyHref) test.skip(true, 'No companies available to test');
    await page.goto(companyHref!);
    await page.waitForLoadState('networkidle');
    const cta = page.locator('a:has-text("Sign in to leave a review")');
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute('href');
    expect(href).toContain('/signin');
    expect(href).toContain('after_auth_return_to');
  });
});
