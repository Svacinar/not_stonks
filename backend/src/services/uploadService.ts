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
    const checkDuplicate = db.prepare(`
      SELECT id FROM transactions
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

    // Process each transaction
    const processTransactions = db.transaction(() => {
      for (const tx of transactions) {
        // Check for duplicate
        const existing = checkDuplicate.get(tx.date, tx.amount, tx.description, tx.bank);

        if (existing) {
          result.duplicates++;
          continue;
        }

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
