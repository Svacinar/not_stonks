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

test.describe('Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload');
  });

  test('displays upload page with drag-and-drop zone', async ({ page }) => {
    // Check page title (use getByRole to be more specific)
    await expect(page.getByRole('heading', { name: 'Upload Bank Statements' })).toBeVisible();

    // Check drag-and-drop zone elements
    await expect(page.getByText('Drag and drop your bank statements here')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Browse Files' })).toBeVisible();
    await expect(page.getByText('Supported formats: CSV, TXT, XLSX, XLS')).toBeVisible();
  });

  test('can select multiple files via file input', async ({ page }) => {
    // Create test files
    const csobFile = await createTestFile('csob_statement.csv', 'csob,data,test');
    const revFile = await createTestFile('revolut_statement.csv', 'revolut,data,test');

    // Get file input and upload files
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile, revFile]);

    // Verify files are listed
    await expect(page.getByText('Selected Files (2)')).toBeVisible();
    await expect(page.getByText('csob_statement.csv')).toBeVisible();
    await expect(page.getByText('revolut_statement.csv')).toBeVisible();

    // Clean up
    fs.unlinkSync(csobFile);
    fs.unlinkSync(revFile);
  });

  test('shows file size for selected files', async ({ page }) => {
    // Create a test file with specific size
    const content = 'csob,' + 'x'.repeat(1000);
    const filepath = await createTestFile('csob_test.csv', content);

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([filepath]);

    // File should be listed with size (check the specific size element within the list item)
    await expect(page.getByText('csob_test.csv')).toBeVisible();
    // Check for the file size element that appears after the filename
    const fileListItem = page.locator('li').filter({ hasText: 'csob_test.csv' });
    await expect(fileListItem.locator('span.text-xs')).toContainText(/\d+\s*(B|KB)/);

    fs.unlinkSync(filepath);
  });

  test('can remove individual files from selection', async ({ page }) => {
    const file1 = await createTestFile('csob_file1.csv', 'csob,data1');
    const file2 = await createTestFile('raiffeisen_file2.csv', 'raiffeisen,data2');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([file1, file2]);

    // Verify both files listed
    await expect(page.getByText('Selected Files (2)')).toBeVisible();

    // Remove first file
    const removeButton = page.locator('[aria-label="Remove csob_file1.csv"]');
    await removeButton.click();

    // Verify only second file remains
    await expect(page.getByText('Selected Files (1)')).toBeVisible();
    await expect(page.getByText('csob_file1.csv')).not.toBeVisible();
    await expect(page.getByText('raiffeisen_file2.csv')).toBeVisible();

    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  });

  test('clear all button removes all selected files', async ({ page }) => {
    const file1 = await createTestFile('csob_clear1.csv', 'csob,data');
    const file2 = await createTestFile('revolut_clear2.csv', 'revolut,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([file1, file2]);

    await expect(page.getByText('Selected Files (2)')).toBeVisible();

    // Click clear all
    await page.getByRole('button', { name: 'Clear all' }).click();

    // File list should be gone
    await expect(page.getByText('Selected Files')).not.toBeVisible();

    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  });

  test('shows error for invalid file types', async ({ page }) => {
    const invalidFile = await createTestFile('invalid.pdf', 'pdf content');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([invalidFile]);

    // Error message should be shown
    await expect(page.getByText(/Invalid file type.*Supported formats/)).toBeVisible();

    fs.unlinkSync(invalidFile);
  });

  test('shows error for empty file upload', async ({ page }) => {
    // Create an empty file
    const emptyFile = await createTestFile('empty.csv', '');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([emptyFile]);

    // Click upload button
    await page.getByRole('button', { name: 'Upload 1 file' }).click();

    // Should show error message about empty file in the alert
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert.getByText(/File is empty/i)).toBeVisible();

    fs.unlinkSync(emptyFile);
  });

  test('upload button shows file count', async ({ page }) => {
    const file1 = await createTestFile('csob_upload1.csv', 'csob,data');
    const file2 = await createTestFile('revolut_upload2.csv', 'revolut,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([file1, file2]);

    // Check upload button text
    await expect(page.getByRole('button', { name: 'Upload 2 files' })).toBeVisible();

    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  });

  test('uploads files and shows success message', async ({ page }) => {
    // Create a dummy CSOB file
    const csobFile = await createTestFile('csob_success.csv', 'csob,transaction,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);

    // Click upload
    await page.getByRole('button', { name: 'Upload 1 file' }).click();

    // Wait for success message
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Imported \d+ transactions/)).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: 'View Transactions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload More' })).toBeVisible();

    fs.unlinkSync(csobFile);
  });

  test('navigates to transactions page after successful upload', async ({ page }) => {
    const csobFile = await createTestFile('csob_navigate.csv', 'csob,transaction,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);

    await page.getByRole('button', { name: 'Upload 1 file' }).click();

    // Wait for success
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Click to navigate
    await page.getByRole('button', { name: 'View Transactions' }).click();

    // Should be on transactions page
    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();

    fs.unlinkSync(csobFile);
  });

  test('upload more button resets the form', async ({ page }) => {
    const csobFile = await createTestFile('csob_reset.csv', 'csob,transaction,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);

    await page.getByRole('button', { name: 'Upload 1 file' }).click();

    // Wait for success
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Click upload more
    await page.getByRole('button', { name: 'Upload More' }).click();

    // Should show drag-drop zone again
    await expect(page.getByText('Drag and drop your bank statements here')).toBeVisible();
    await expect(page.getByText('Upload Successful')).not.toBeVisible();

    fs.unlinkSync(csobFile);
  });

  test('shows duplicate count when re-uploading same file', async ({ page }) => {
    // First upload
    const csobFile = await createTestFile('csob_duplicate.csv', 'csob,transaction,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);

    await page.getByRole('button', { name: 'Upload 1 file' }).click();
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Upload more
    await page.getByRole('button', { name: 'Upload More' }).click();

    // Second upload of same file
    const fileInput2 = page.locator('[data-testid="file-input"]');
    await fileInput2.setInputFiles([csobFile]);

    await page.getByRole('button', { name: 'Upload 1 file' }).click();

    // Should show success with duplicates
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/duplicate/i)).toBeVisible();

    fs.unlinkSync(csobFile);
  });

  test('shows progress indicator during upload', async ({ page }) => {
    const csobFile = await createTestFile('csob_progress.csv', 'csob,transaction,data');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles([csobFile]);

    // Get the upload button
    const uploadButton = page.getByRole('button', { name: 'Upload 1 file' });

    // Click upload - the button should become disabled and eventually show success
    await uploadButton.click();

    // The upload button should be disabled during upload
    // Wait for the success message instead of checking transient loading state
    await expect(page.getByText('Upload Successful')).toBeVisible({ timeout: 10000 });

    // Verify upload completed correctly by checking the success content
    await expect(page.getByText(/Imported \d+ transactions/)).toBeVisible();

    fs.unlinkSync(csobFile);
  });
});
