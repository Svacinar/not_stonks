import { getDatabase } from '../db/database';
import { parserService } from '../parsers/ParserService';
import type { ParsedTransaction, BankName, UploadResponse } from 'shared/types';

interface FileUpload {
  buffer: Buffer;
  filename: string;
}

interface CategoryRule {
  keyword: string;
  category_id: number;
}

/**
 * UploadService - Handles file upload processing
 *
 * Responsibilities:
 * - Parse uploaded files using ParserService
 * - Apply categorization rules to new transactions
 * - Deduplicate against existing transactions
 * - Insert new transactions into database
 * - Log uploads to upload_log table
 */
export class UploadService {
  /**
   * Process multiple file uploads
   */
  async processUploads(files: FileUpload[]): Promise<UploadResponse> {
    const result: UploadResponse = {
      success: true,
      imported: 0,
      duplicates: 0,
      byBank: {
        CSOB: 0,
        Raiffeisen: 0,
        Revolut: 0,
      },
    };

    const db = getDatabase();

    for (const file of files) {
      const fileResult = await this.processFile(file, db);
      result.imported += fileResult.imported;
      result.duplicates += fileResult.duplicates;

      // Aggregate by bank
      for (const bank of Object.keys(fileResult.byBank) as BankName[]) {
        result.byBank[bank] += fileResult.byBank[bank];
      }
    }

    return result;
  }

  /**
   * Process a single file upload
   */
  private async processFile(
    file: FileUpload,
    db: ReturnType<typeof getDatabase>
  ): Promise<UploadResponse> {
    const result: UploadResponse = {
      success: true,
      imported: 0,
      duplicates: 0,
      byBank: {
        CSOB: 0,
        Raiffeisen: 0,
        Revolut: 0,
      },
    };

    // Parse the file
    const transactions = await parserService.parse(file.buffer, file.filename);

    if (transactions.length === 0) {
      return result;
    }

    // Get categorization rules
    const rules = this.getCategoryRules(db);

    // Prepare statements
    // Count existing transactions with same signature (allows multiple legitimate same-day purchases)
    const countExisting = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE date = ? AND amount = ? AND description = ? AND bank = ?
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (date, amount, description, bank, category_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertUploadLog = db.prepare(`
      INSERT INTO upload_log (filename, bank, transaction_count)
      VALUES (?, ?, ?)
    `);

    // Track imported per bank for this file
    const importedByBank: Record<BankName, number> = {
      CSOB: 0,
      Raiffeisen: 0,
      Revolut: 0,
    };

    // Count occurrences of each transaction signature in the upload
    // This allows us to handle multiple legitimate same-day purchases
    const uploadCounts = new Map<string, number>();
    for (const tx of transactions) {
      const key = `${tx.date}|${tx.amount}|${tx.description}|${tx.bank}`;
      uploadCounts.set(key, (uploadCounts.get(key) || 0) + 1);
    }

    // Get existing counts from DB BEFORE processing (snapshot)
    // This prevents issues with newly inserted rows being counted
    const existingCounts = new Map<string, number>();
    for (const key of uploadCounts.keys()) {
      const [date, amount, description, bank] = key.split('|');
      const existingResult = countExisting.get(date, parseFloat(amount), description, bank) as { count: number };
      existingCounts.set(key, existingResult.count);
    }

    // Track how many of each signature we've processed in this upload
    const processedCounts = new Map<string, number>();

    // Process each transaction
    const processTransactions = db.transaction(() => {
      for (const tx of transactions) {
        const key = `${tx.date}|${tx.amount}|${tx.description}|${tx.bank}`;
        const processedSoFar = processedCounts.get(key) || 0;
        const existingCount = existingCounts.get(key) || 0;
        const uploadCount = uploadCounts.get(key)!;

        // Calculate how many we should import: uploadCount - existingCount
        // If we've already processed that many, skip the rest as duplicates
        const toImport = Math.max(0, uploadCount - existingCount);

        if (processedSoFar >= toImport) {
          // Already imported enough of this signature
          result.duplicates++;
          processedCounts.set(key, processedSoFar + 1);
          continue;
        }

        processedCounts.set(key, processedSoFar + 1);

        // Apply categorization
        const categoryId = this.categorizeTransaction(tx, rules);

        // Insert transaction
        insertTransaction.run(tx.date, tx.amount, tx.description, tx.bank, categoryId);
        result.imported++;
        importedByBank[tx.bank]++;
      }

      // Log the upload if any transactions were imported
      if (result.imported > 0) {
        // Get the bank from the first transaction (all transactions in a file should be from same bank)
        const bank = transactions[0].bank;
        insertUploadLog.run(file.filename, bank, result.imported);
      }
    });

    processTransactions();

    // Set byBank result
    result.byBank = importedByBank;

    return result;
  }

  /**
   * Get all category rules from database
   */
  private getCategoryRules(db: ReturnType<typeof getDatabase>): CategoryRule[] {
    return db.prepare('SELECT keyword, category_id FROM category_rules').all() as CategoryRule[];
  }

  /**
   * Apply categorization rules to a transaction
   * Returns category_id if a rule matches, null otherwise
   */
  private categorizeTransaction(
    tx: ParsedTransaction,
    rules: CategoryRule[]
  ): number | null {
    const descriptionLower = tx.description.toLowerCase();

    for (const rule of rules) {
      if (descriptionLower.includes(rule.keyword.toLowerCase())) {
        return rule.category_id;
      }
    }

    return null;
  }
}

// Export a singleton instance
export const uploadService = new UploadService();
