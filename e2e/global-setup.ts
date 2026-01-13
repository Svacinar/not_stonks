import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for E2E tests
 *
 * This function runs once before all test workers start.
 * It prepares the test environment by:
 * 1. Creating a clean test database directory
 * 2. Ensuring the test database is reset
 */
async function globalSetup(config: FullConfig): Promise<void> {
  // Create e2e test data directory for databases
  const e2eDataDir = path.join(__dirname, '..', 'backend', 'data', 'e2e');

  // Clean up any existing test databases from previous runs
  if (fs.existsSync(e2eDataDir)) {
    const files = fs.readdirSync(e2eDataDir);
    for (const file of files) {
      fs.unlinkSync(path.join(e2eDataDir, file));
    }
  } else {
    fs.mkdirSync(e2eDataDir, { recursive: true });
  }

  console.log('[E2E Setup] Test database directory prepared');
}

export default globalSetup;
