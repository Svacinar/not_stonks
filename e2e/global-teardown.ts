import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for E2E tests
 *
 * This function runs once after all test workers complete.
 * It cleans up test resources.
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  // Clean up e2e test data directory
  const e2eDataDir = path.join(__dirname, '..', 'backend', 'data', 'e2e');

  if (fs.existsSync(e2eDataDir)) {
    const files = fs.readdirSync(e2eDataDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(e2eDataDir, file));
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      fs.rmdirSync(e2eDataDir);
    } catch {
      // Ignore if directory not empty
    }
  }

  console.log('[E2E Teardown] Test cleanup complete');
}

export default globalTeardown;
