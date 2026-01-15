import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  // Use more specific selector for the app brand in sidebar
  await expect(page.getByText('Not Stonks')).toBeVisible();
});
