import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

test.describe('Admin Company Management', () => {
  const TEST_PREFIX = '[E2E-TEST]';
  let testCompanyName: string;
  let testCompanyId: string | null = null;

  // Helper: Login as admin
  async function loginAsAdmin(page: Page) {
    await page.goto('/admin/login');
    await page.fill('#email', process.env.ADMIN_EMAIL!);
    await page.fill('#password', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  }

  // Helper: Delete test company via API if it exists
  async function deleteTestCompany(page: Page, companyId: string) {
    try {
      await page.goto(`/admin/manage?id=${companyId}`);
      await page.waitForLoadState('networkidle');

      // Accept the confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      const deleteButton = page.locator('button:has-text("Delete Company")');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForURL('/admin/companies', { timeout: 10000 });
      }
    } catch {
      // Company may already be deleted
    }
  }

  // Helper: Find test company by name and get its ID
  async function findTestCompanyId(page: Page, companyName: string): Promise<string | null> {
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // Search for the test company
    await page.fill('input[placeholder="Search companies..."]', companyName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Wait for table to appear
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => null);

    // Look for the row containing the company name, then find the Edit link
    const row = page.locator('tr', { hasText: companyName }).first();
    if (await row.count() > 0) {
      const editLink = row.locator('a:has-text("Edit")').first();
      if (await editLink.count() > 0) {
        const href = await editLink.getAttribute('href');
        const match = href?.match(/id=([a-f0-9-]+)/);
        return match ? match[1] : null;
      }
    }
    return null;
  }

  test.beforeEach(async () => {
    // Generate unique company name for each test
    testCompanyName = `${TEST_PREFIX} Company ${Date.now()}`;
    testCompanyId = null;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test company if it was created
    if (testCompanyId) {
      await loginAsAdmin(page);
      await deleteTestCompany(page, testCompanyId);
    }
  });

  test('can create a new company', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to create page
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    // Verify we're on create mode
    await expect(page.locator('h1:has-text("Create Company")')).toBeVisible();

    // Fill required fields
    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-company.example.com');
    await page.fill('#description', 'This is a test company created by E2E tests. It provides AI services for testing purposes.');
    await page.selectOption('#hq_country', 'United Arab Emirates');

    // Upload logo
    const logoPath = path.join(__dirname, 'fixtures', 'test-logo.png');
    await page.setInputFiles('#logo-upload', logoPath);

    // Wait for logo preview to appear
    await expect(page.locator('img[alt="Logo preview"]')).toBeVisible();

    // Set company type checkboxes
    await page.check('label:has-text("AI Infrastructure Provider") input[type="checkbox"]');

    // Select a capability (use actual tag from constants)
    await page.check('label:has-text("AI Voice") input[type="checkbox"]');

    // Select an industry (use actual industry from constants)
    await page.check('label:has-text("Healthcare") input[type="checkbox"]');

    // Add a product
    await page.click('button:has-text("Add Product")');
    await page.fill('input[placeholder="Product name"]', 'Test AI Product');
    await page.fill('textarea[placeholder="Product description"]', 'A test product for E2E testing.');
    // Click Add button to confirm the product
    await page.click('button:has-text("Add"):not(:has-text("Add Product"))');

    // Submit the form
    await page.click('button:has-text("Create Company")');

    // Wait for redirect to companies list
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Verify company appears in list
    await page.fill('input[placeholder="Search companies..."]', testCompanyName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Verify company is visible with Approved status
    await expect(page.locator(`text=${testCompanyName}`)).toBeVisible();
    await expect(page.locator('tr', { has: page.locator(`text=${testCompanyName}`) }).locator('text=Approved')).toBeVisible();

    // Store company ID for cleanup
    testCompanyId = await findTestCompanyId(page, testCompanyName);
  });

  test('can edit an existing company', async ({ page }) => {
    await loginAsAdmin(page);

    // First create a company to edit
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-original.example.com');
    await page.fill('#description', 'Original description for editing test.');
    await page.selectOption('#hq_country', 'Saudi Arabia');

    // Upload initial logo
    const logoPath = path.join(__dirname, 'fixtures', 'test-logo.png');
    await page.setInputFiles('#logo-upload', logoPath);
    await expect(page.locator('img[alt="Logo preview"]')).toBeVisible();

    // Add a product
    await page.click('button:has-text("Add Product")');
    await page.fill('input[placeholder="Product name"]', 'Original Product');
    await page.fill('textarea[placeholder="Product description"]', 'Original product description.');
    await page.click('button:has-text("Add"):not(:has-text("Add Product"))');

    await page.click('button:has-text("Create Company")');
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Find and store the company ID
    testCompanyId = await findTestCompanyId(page, testCompanyName);
    expect(testCompanyId).toBeTruthy();

    // Navigate to edit page
    await page.goto(`/admin/manage?id=${testCompanyId}`);
    await page.waitForLoadState('networkidle');

    // Verify we're on edit mode with pre-populated data
    await expect(page.locator('h1:has-text("Edit Company")')).toBeVisible();
    await expect(page.locator('#name')).toHaveValue(testCompanyName);
    await expect(page.locator('#description')).toHaveValue('Original description for editing test.');

    // Update company name
    const updatedName = `${testCompanyName} UPDATED`;
    await page.fill('#name', updatedName);

    // Update description
    await page.fill('#description', 'Updated description for editing test.');

    // Replace logo with new file
    const newLogoPath = path.join(__dirname, 'fixtures', 'test-logo-2.png');
    await page.setInputFiles('#logo-upload', newLogoPath);

    // Edit the existing product (click Edit first)
    await page.click('button:has-text("Edit")');
    await page.fill('input[placeholder="Product name"]', 'Updated Product Name');
    await page.click('button:has-text("Save")');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for redirect
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Verify updated company name appears
    await page.fill('input[placeholder="Search companies..."]', updatedName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    await expect(page.locator(`text=${updatedName}`)).toBeVisible();

    // Update test company name for cleanup
    testCompanyName = updatedName;
  });

  test('can delete a company', async ({ page }) => {
    await loginAsAdmin(page);

    // First create a company to delete
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-delete.example.com');
    await page.fill('#description', 'Company to be deleted in test.');
    await page.selectOption('#hq_country', 'Egypt');

    await page.click('button:has-text("Create Company")');
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Find the company ID
    testCompanyId = await findTestCompanyId(page, testCompanyName);
    expect(testCompanyId).toBeTruthy();

    // Navigate to edit page
    await page.goto(`/admin/manage?id=${testCompanyId}`);
    await page.waitForLoadState('networkidle');

    // Setup dialog handler before clicking delete
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('permanently delete');
      await dialog.accept();
    });

    // Click delete button
    await page.click('button:has-text("Delete Company")');

    // Wait for redirect to companies list
    await page.waitForURL('/admin/companies', { timeout: 10000 });

    // Verify company no longer appears
    await page.fill('input[placeholder="Search companies..."]', testCompanyName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Company should not be found
    await expect(page.locator(`td:has-text("${testCompanyName}")`)).not.toBeVisible();

    // Mark as deleted so afterEach doesn't try to clean up
    testCompanyId = null;
  });

  test('search filters companies by name', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a company with a unique searchable name
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    const uniqueSearchTerm = `SEARCHTEST${Date.now()}`;
    testCompanyName = `${TEST_PREFIX} ${uniqueSearchTerm}`;

    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-search.example.com');
    await page.fill('#description', 'Company for search test.');
    await page.selectOption('#hq_country', 'Qatar');

    await page.click('button:has-text("Create Company")');
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Store ID for cleanup
    testCompanyId = await findTestCompanyId(page, testCompanyName);

    // Test search functionality
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // Search for the unique term
    await page.fill('input[placeholder="Search companies..."]', uniqueSearchTerm);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Verify our company appears
    await expect(page.locator(`text=${testCompanyName}`)).toBeVisible();

    // Search for a non-existent term
    await page.fill('input[placeholder="Search companies..."]', 'NONEXISTENTCOMPANYXYZ123');
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Verify our company doesn't appear (the unique search term shouldn't match)
    await expect(page.locator(`td:has-text("${testCompanyName}")`)).not.toBeVisible();
  });

  test('filter by country works', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a company in a specific country (Qatar - less common)
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-country.example.com');
    await page.fill('#description', 'Company for country filter test.');
    await page.selectOption('#hq_country', 'Qatar');

    await page.click('button:has-text("Create Company")');
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Store ID for cleanup
    testCompanyId = await findTestCompanyId(page, testCompanyName);

    // Test country filter
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // First clear any existing filters and search for our company
    await page.fill('input[placeholder="Search companies..."]', TEST_PREFIX);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Filter by Qatar - get the second select element (country dropdown)
    const countrySelect = page.locator('select').nth(1);
    await countrySelect.selectOption('Qatar');
    await page.waitForLoadState('networkidle');

    // Verify our Qatar company appears
    await expect(page.locator(`text=${testCompanyName}`)).toBeVisible();

    // Filter by a different country (Egypt - should hide our company)
    await countrySelect.selectOption('Egypt');
    await page.waitForLoadState('networkidle');

    // Our company should not appear when filtering by Egypt
    await expect(page.locator(`td:has-text("${testCompanyName}")`)).not.toBeVisible();
  });

  test('filter by AI Infrastructure works', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a company with AI Infrastructure checked
    await page.goto('/admin/manage');
    await page.waitForLoadState('networkidle');

    await page.fill('#name', testCompanyName);
    await page.fill('#website', 'https://e2e-test-infra.example.com');
    await page.fill('#description', 'Company for AI Infrastructure filter test.');
    await page.selectOption('#hq_country', 'United Arab Emirates');
    await page.check('label:has-text("AI Infrastructure Provider") input[type="checkbox"]');

    await page.click('button:has-text("Create Company")');
    await page.waitForURL('/admin/companies', { timeout: 30000 });

    // Store ID for cleanup
    testCompanyId = await findTestCompanyId(page, testCompanyName);

    // Test AI Infrastructure filter
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // Search for our test company
    await page.fill('input[placeholder="Search companies..."]', testCompanyName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Check AI Infra filter (in the companies list page)
    await page.check('label:has-text("AI Infra") input[type="checkbox"]');
    await page.waitForLoadState('networkidle');

    // Our company should still appear
    await expect(page.locator(`text=${testCompanyName}`)).toBeVisible();

    // Uncheck AI Infra and check AI Platform instead
    await page.uncheck('label:has-text("AI Infra") input[type="checkbox"]');
    await page.waitForLoadState('networkidle');
    await page.check('label:has-text("AI Platform") input[type="checkbox"]');
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // Our company should not appear (it only has AI Infrastructure, not AI Platform)
    // Use a specific search for our company first to narrow down
    await page.fill('input[placeholder="Search companies..."]', testCompanyName);
    await page.waitForResponse(resp => resp.url().includes('/api/admin/companies') && resp.status() === 200);

    // The company should not be visible since it doesn't have AI Platform
    await expect(page.locator(`td:has-text("${testCompanyName}")`)).not.toBeVisible();
  });
});
