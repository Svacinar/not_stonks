import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Configuration
 *
 * Configured for parallel test execution with database isolation.
 * Strategy:
 * - Uses a dedicated E2E test database (separate from development)
 * - Global setup ensures fresh database for each test run
 * - Tests run in parallel across files using multiple workers
 * - Tests within the same file run sequentially to maintain logical ordering
 */
export default defineConfig({
  testDir: './tests',
  /* Tests in different files run in parallel, tests in same file run sequentially */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use multiple workers for parallel file execution */
  workers: process.env.CI ? 4 : '50%',
  /* Reporter configuration */
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  /* Timeout configuration - reduced for faster feedback */
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  outputDir: './test-results',

  /* Global setup and teardown for database isolation */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  /* Test projects configuration */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run the dev server with E2E test database */
  webServer: {
    command: `DB_PATH=${path.join(__dirname, '..', 'backend', 'data', 'e2e', 'test.db')} npm run dev`,
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      DB_PATH: path.join(__dirname, '..', 'backend', 'data', 'e2e', 'test.db'),
    },
  },
});
