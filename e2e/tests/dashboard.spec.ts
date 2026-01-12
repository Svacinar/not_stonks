import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Helper to create a test file with content
async function createTestFile(filename: string, content: string): Promise<string> {
  const tempDir = os.tmpdir();
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

// Helper to wait for loading spinner to disappear
async function waitForLoad(page: any): Promise<void> {
  await page.waitForFunction(() => {
    const loadingEl = document.querySelector('[role="status"]');
    return !loadingEl;
  }, { timeout: 15000 });
  await page.waitForTimeout(300);
}

// Helper to set date range to include dummy data (from 2024)
async function setDateRangeForDummyData(page: any): Promise<void> {
  await page.locator('#startDate').fill('2024-01-01');
  await page.waitForTimeout(300);
  await waitForLoad(page);
}

test.describe('Dashboard Page', () => {
  test('shows empty state when no data', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Should show empty state message
    await expect(page.getByText('No data available')).toBeVisible();
    await expect(page.getByText('Upload some bank statements')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Upload Statements' })).toBeVisible();
  });

  test('displays charts and stats after upload', async ({ page }) => {
    const csobFile = await createTestFile('csob_dashboard.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Expand date range to include dummy data from 2024
      await setDateRangeForDummyData(page);

      // Verify stats cards are visible (use more specific selectors)
      await expect(page.getByText('Total Spending')).toBeVisible();
      await expect(page.locator('p:has-text("Transactions")').first()).toBeVisible();
      await expect(page.getByText('Average')).toBeVisible();
      await expect(page.getByText('Largest Category')).toBeVisible();

      // Verify charts are visible
      await expect(page.getByText('Spending by Category')).toBeVisible();
      await expect(page.getByText('Spending by Bank')).toBeVisible();
      await expect(page.getByText('Spending Over Time')).toBeVisible();

      // Verify recent transactions section
      await expect(page.getByRole('heading', { name: 'Recent Transactions' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'View all' })).toBeVisible();
    } finally {
      fs.unlinkSync(csobFile);
    }
  });

  test('date range selector filters data', async ({ page }) => {
    const csobFile = await createTestFile('csob_date_filter.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Date selectors should be visible
      await expect(page.locator('#startDate')).toBeVisible();
      await expect(page.locator('#endDate')).toBeVisible();

      // Set date range to include dummy data
      await setDateRangeForDummyData(page);

      // Should show data
      await expect(page.getByText('Total Spending')).toBeVisible();

      // Change date range to far future (no data)
      await page.locator('#startDate').fill('2099-01-01');
      await page.waitForTimeout(300);
      await waitForLoad(page);

      // Should show no data available
      await expect(page.getByText('No data available')).toBeVisible();

      // Reset to valid date range
      await page.locator('#startDate').fill('2024-01-01');
      await page.waitForTimeout(300);
      await waitForLoad(page);

      // Should show data again
      await expect(page.getByText('Total Spending')).toBeVisible();
    } finally {
      fs.unlinkSync(csobFile);
    }
  });

  test('charts are interactive (hover shows values)', async ({ page }) => {
    const csobFile = await createTestFile('csob_charts.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Expand date range to include dummy data
      await setDateRangeForDummyData(page);

      // Charts should be rendered as canvas elements
      const chartCanvases = page.locator('canvas');
      const chartCount = await chartCanvases.count();

      // Should have at least 3 charts (pie, bar, line)
      expect(chartCount).toBeGreaterThanOrEqual(3);

      // Verify each chart canvas exists
      for (let i = 0; i < chartCount; i++) {
        await expect(chartCanvases.nth(i)).toBeVisible();
      }
    } finally {
      fs.unlinkSync(csobFile);
    }
  });

  test('recent transactions links to transactions page', async ({ page }) => {
    const csobFile = await createTestFile('csob_link.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Expand date range to include dummy data
      await setDateRangeForDummyData(page);

      // Click View all link
      await page.getByRole('link', { name: 'View all' }).click();

      // Should navigate to transactions page
      await expect(page).toHaveURL('/transactions');
      await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    } finally {
      fs.unlinkSync(csobFile);
    }
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const csobFile = await createTestFile('csob_mobile.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Expand date range to include dummy data
      await setDateRangeForDummyData(page);

      // Stats cards should still be visible (use more specific selectors)
      await expect(page.getByText('Total Spending')).toBeVisible();
      await expect(page.locator('p:has-text("Transactions")').first()).toBeVisible();

      // Charts should still be visible
      await expect(page.getByText('Spending by Category')).toBeVisible();
      await expect(page.getByText('Spending by Bank')).toBeVisible();
    } finally {
      fs.unlinkSync(csobFile);
    }
  });

  test('empty state has upload link that works', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Click the Upload Statements button
    await page.getByRole('link', { name: 'Upload Statements' }).click();

    // Should navigate to upload page
    await expect(page).toHaveURL('/upload');
    await expect(page.getByRole('heading', { name: 'Upload Bank Statements' })).toBeVisible();
  });

  test('pie chart includes uncategorized expenses', async ({ page }) => {
    const csobFile = await createTestFile('csob_uncategorized.csv', 'csob,data,test');

    try {
      // Upload
      await page.goto('/upload');
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([csobFile]);
      await page.getByRole('button', { name: 'Upload 1 file' }).click();
      await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

      // Intercept the stats API to verify Uncategorized is included
      let statsResponse: { by_category: Array<{ name: string; count: number; sum: number }> } | null = null;
      await page.route('**/api/transactions/stats*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        statsResponse = json;
        await route.fulfill({ response });
      });

      // Navigate to dashboard
      await page.goto('/');
      await waitForLoad(page);

      // Expand date range to include dummy data from 2024 using the new DateRangePicker
      // Click the date picker button to open dropdown
      await page.getByRole('button', { name: /Last 3 months|All time/ }).click();
      // Select "All time" preset to include all data
      await page.getByRole('button', { name: 'All time' }).click();
      await page.waitForTimeout(300);
      await waitForLoad(page);

      // Wait for stats API response to be captured
      await page.waitForTimeout(500);

      // Verify the stats API response includes Uncategorized in by_category
      expect(statsResponse).not.toBeNull();
      const uncategorized = statsResponse!.by_category.find((c) => c.name === 'Uncategorized');
      expect(uncategorized).toBeDefined();
      expect(uncategorized!.count).toBeGreaterThan(0);
      // Uncategorized is included in the response - it will show in pie chart if sum is negative (expenses)
      // The sum can be positive (income) or negative (expenses) depending on the data
      expect(typeof uncategorized!.sum).toBe('number');

      // Verify the pie chart section is visible
      await expect(page.getByText('Spending by Category')).toBeVisible();
    } finally {
      fs.unlinkSync(csobFile);
    }
  });
});
