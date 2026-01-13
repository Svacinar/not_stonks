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

test.describe('Transactions Page', () => {
  // Configure tests to run sequentially within this file
  test.describe.configure({ mode: 'serial' });

  // First upload some data, then test the transactions page
  test('displays transactions with all features after upload', async ({ page }) => {
    // Create test file
    const csobFile = await createTestFile('csob_e2e.csv', 'csob,data,test');

    // Upload
    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Navigate to transactions via button
    await page.getByRole('button', { name: 'View Transactions' }).click();
    // URL may contain query params from date range
    await expect(page).toHaveURL(/\/transactions/);

    // Wait for page load
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();

    // Select "All time" date range to include dummy data from 2024
    // Use force: true to avoid click interception issues with sidebar on some viewports
    await page.getByRole('button', { name: 'Select date range' }).click();
    await page.getByRole('button', { name: 'All time' }).click({ force: true });
    await page.waitForTimeout(300);

    // Wait for either loading to complete or table to appear
    await page.waitForFunction(() => {
      const loadingEl = document.querySelector('[role="status"]');
      const tableRows = document.querySelectorAll('table tbody tr');
      return !loadingEl || tableRows.length > 0;
    }, { timeout: 10000 });

    // Verify table structure (columns)
    const headers = page.locator('thead th');
    await expect(headers).toHaveCount(5);
    await expect(page.locator('thead th').first()).toContainText('Date');
    await expect(page.locator('thead th').nth(1)).toContainText('Description');
    await expect(page.locator('thead th').nth(2)).toContainText('Amount');
    await expect(page.locator('thead th').nth(3)).toContainText('Bank');
    await expect(page.locator('thead th').nth(4)).toContainText('Category');

    // Verify filter panel - DateRangePicker button and search
    await expect(page.getByRole('button', { name: 'Select date range' })).toBeVisible();
    await expect(page.getByPlaceholder('Search descriptions...')).toBeVisible();
    await expect(page.getByLabel('CSOB')).toBeVisible();
    await expect(page.getByLabel('Raiffeisen')).toBeVisible();
    await expect(page.getByLabel('Revolut')).toBeVisible();

    // Verify export button
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    // Verify table has transactions (at least some from CSOB dummy parser)
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Clean up
    fs.unlinkSync(csobFile);
  });

  test('filters transactions by bank', async ({ page }) => {
    // Create test files for multiple banks
    const csobFile = await createTestFile('csob_filter.csv', 'csob,data,test');
    const revFile = await createTestFile('revolut_filter.csv', 'revolut,data,test');

    // Upload both
    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile, revFile]);
    await page.getByRole('button', { name: 'Upload 2 files' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Navigate to transactions
    await page.getByRole('button', { name: 'View Transactions' }).click();
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();

    // Select "All time" date range to include dummy data from 2024
    const dateButton = page.getByRole('button', { name: 'Select date range' });
    await dateButton.click();
    // Wait for dropdown to open and then click All time
    const allTimeButton = page.getByRole('button', { name: 'All time' });
    await allTimeButton.waitFor({ state: 'visible', timeout: 5000 });
    await allTimeButton.click({ force: true });
    await page.waitForTimeout(300);

    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Initially should have transactions
    const initialCount = await page.locator('table tbody tr').count();
    expect(initialCount).toBeGreaterThan(0);

    // Filter by CSOB only (use click instead of check to handle already-checked state)
    const csobCheckbox = page.getByLabel('CSOB');
    const isChecked = await csobCheckbox.isChecked();
    if (!isChecked) {
      await csobCheckbox.click();
    }
    await page.waitForTimeout(500);

    // Should show only CSOB transactions
    const filteredCount = await page.locator('table tbody tr').count();
    expect(filteredCount).toBeGreaterThan(0);

    // URL should reflect filter
    await expect(page).toHaveURL(/bank=CSOB/);

    // All visible rows should be CSOB
    const bankCells = page.locator('table tbody tr td:nth-child(4)');
    for (let i = 0; i < 10; i++) {
      await expect(bankCells.nth(i)).toHaveText('CSOB');
    }

    // Clean up
    fs.unlinkSync(csobFile);
    fs.unlinkSync(revFile);
  });

  test('sorts transactions by column', async ({ page }) => {
    // Create test file
    const csobFile = await createTestFile('csob_sort.csv', 'csob,data,test');

    // Upload
    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Navigate
    await page.getByRole('button', { name: 'View Transactions' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Default sort by date (desc)
    await expect(page.locator('thead th').first()).toContainText('▼');

    // Click amount header to sort by amount
    await page.locator('thead th').nth(2).click();
    await page.waitForTimeout(500);

    // URL should update
    await expect(page).toHaveURL(/sort=amount/);

    // Amount header should show sort indicator
    await expect(page.locator('thead th').nth(2)).toContainText('▼');

    // Click again to reverse
    await page.locator('thead th').nth(2).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/order=asc/);

    fs.unlinkSync(csobFile);
  });

  test('inline category editing works', async ({ page }) => {
    const csobFile = await createTestFile('csob_edit.csv', 'csob,data,test');

    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Transactions' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click on first transaction's category
    const firstRow = page.locator('table tbody tr').first();
    const categoryButton = firstRow.locator('td').nth(4).locator('button');
    await categoryButton.click();

    // Dropdown should appear
    const select = firstRow.locator('td').nth(4).locator('select');
    await expect(select).toBeVisible();

    // Should have options
    const options = select.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);

    // Select first category (after Uncategorized)
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Category should be updated (no longer Uncategorized)
    await expect(firstRow.locator('td').nth(4).locator('button')).not.toContainText('Uncategorized');

    fs.unlinkSync(csobFile);
  });

  test('export modal works', async ({ page }) => {
    const csobFile = await createTestFile('csob_export.csv', 'csob,data,test');

    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Transactions' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Open export modal
    await page.getByRole('button', { name: 'Export' }).click();
    await expect(page.getByRole('heading', { name: 'Export Transactions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Export Transactions' })).not.toBeVisible();

    // Open again and download CSV
    await page.getByRole('button', { name: 'Export' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/transactions_\d{4}-\d{2}-\d{2}\.csv/);

    fs.unlinkSync(csobFile);
  });

  test('search and uncategorized filter work', async ({ page }) => {
    const csobFile = await createTestFile('csob_search.csv', 'csob,data,test');

    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Transactions' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Test search
    await page.getByPlaceholder('Search descriptions...').fill('ALBERT');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/search=ALBERT/);

    // Clear search
    await page.getByPlaceholder('Search descriptions...').clear();
    await page.waitForTimeout(500);

    // Test uncategorized filter
    await page.getByLabel('Uncategorized only').click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/uncategorized=true/);

    // All shown should be uncategorized
    const categoryButtons = page.locator('table tbody tr td:nth-child(5) button');
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(categoryButtons.nth(i)).toContainText('Uncategorized');
    }

    fs.unlinkSync(csobFile);
  });

  test('pagination displays correctly', async ({ page }) => {
    const csobFile = await createTestFile('csob_pagination.csv', 'csob,data,test');

    await page.goto('/upload');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);
    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Transactions' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Should show pagination info (shows the count of transactions)
    await expect(page.getByText(/Showing.*\d+.*transaction/)).toBeVisible();

    fs.unlinkSync(csobFile);
  });
});
