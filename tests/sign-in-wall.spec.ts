import { test, expect } from '@playwright/test';

test.describe('Sign-In Wall', () => {
  test.describe('Search page (unauthenticated)', () => {
    test('shows blur overlay and CTA when results exceed 2', async ({ page }) => {
      await page.goto('/search?q=AI');
      await page.waitForLoadState('networkidle');

      // The "Get full access — sign in for free" CTA should be visible
      await expect(page.locator('a:has-text("Get full access — sign in for free")')).toBeVisible();

      // The blurred container should exist
      await expect(page.locator('[aria-hidden="true"].blur-sm')).toBeVisible();

      // Pagination should NOT be visible
      await expect(page.locator('nav[aria-label="Pagination"]')).not.toBeVisible();
    });

    test('CTA links to sign-in with return URL', async ({ page }) => {
      await page.goto('/search?q=AI');
      await page.waitForLoadState('networkidle');

      const ctaLink = page.locator('a:has-text("Get full access — sign in for free")');
      const href = await ctaLink.getAttribute('href');
      expect(href).toContain('/signin');
      expect(href).toContain('after_auth_return_to');
      expect(href).toContain(encodeURIComponent('/search?q=AI'));
    });
  });

  test.describe('Company detail page (unauthenticated)', () => {
    test('redirects to sign-in with return URL', async ({ page }) => {
      // Navigate to any approved company page
      // First find a company slug from search results
      await page.goto('/search?q=AI');
      await page.waitForLoadState('networkidle');

      // Get the first company link
      const firstCompanyLink = page.locator('a[href^="/company/"]').first();
      const companyHref = await firstCompanyLink.getAttribute('href');

      if (companyHref) {
        // Navigate directly to company page
        await page.goto(companyHref);

        // Should be redirected to sign-in
        await page.waitForURL(/\/signin/);
        expect(page.url()).toContain('after_auth_return_to');
      }
    });
  });

  test.describe('SEO bot access', () => {
    test('Googlebot can access company detail page', async ({ browser }) => {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      });
      const page = await context.newPage();

      // Navigate to search to find a company
      await page.goto('/search?q=AI');
      await page.waitForLoadState('networkidle');

      const firstCompanyLink = page.locator('a[href^="/company/"]').first();
      const companyHref = await firstCompanyLink.getAttribute('href');

      if (companyHref) {
        await page.goto(companyHref);
        // Should NOT be redirected — should stay on company page
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/company/');
        expect(page.url()).not.toContain('/signin');
      }

      await context.close();
    });
  });
});
