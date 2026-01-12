import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  // Use more specific selector for the header title
  await expect(page.getByRole('heading', { name: 'Spending Dashboard' })).toBeVisible();
});
