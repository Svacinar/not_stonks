import { getDatabase } from '../db/database';
import { parserService } from '../parsers/ParserService';
import type { ParsedTransaction, BankName, UploadResponse, ParseResponse } from 'shared/types';
import { randomUUID } from 'crypto';

interface FileUpload {
  buffer: Buffer;
  filename: string;
}

interface CategoryRule {
  keyword: string;
  category_id: number;
}

// Store parsed transactions temporarily during the two-step import flow
const parsedSessionsCache = new Map<string, ParsedTransaction[]>();

// Clean up old sessions periodically (cache has max 100 entries)
const SESSION_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
  // If cache gets too big, clear oldest entries
  if (parsedSessionsCache.size > 100) {
    const keys = Array.from(parsedSessionsCache.keys());
    // Remove first 50 entries (oldest)
    keys.slice(0, 50).forEach(key => parsedSessionsCache.delete(key));
  }
}, SESSION_CLEANUP_INTERVAL_MS);

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
   * Parse files and return summary with currencies detected (step 1 of two-step import)
   * Stores parsed transactions in session cache for later import
   */
  async parseOnly(files: FileUpload[]): Promise<ParseResponse> {
    const allTransactions: ParsedTransaction[] = [];
    const byBank: Record<BankName, number> = { CSOB: 0, Raiffeisen: 0, Revolut: 0 };
    const byCurrency: Record<string, number> = {};
    const currencies = new Set<string>();

    for (const file of files) {
      const transactions = await parserService.parse(file.buffer, file.filename);
      allTransactions.push(...transactions);

      for (const tx of transactions) {
        byBank[tx.bank]++;
        const currency = tx.currency || 'CZK';
        currencies.add(currency);
        byCurrency[currency] = (byCurrency[currency] || 0) + 1;
      }
    }

    // Store in session cache
    const sessionId = randomUUID();
    parsedSessionsCache.set(sessionId, allTransactions);

    return {
      success: true,
      parsed: allTransactions.length,
      currencies: Array.from(currencies),
      byBank,
      byCurrency,
      sessionId,
    };
  }

  /**
   * Complete import with conversion rates (step 2 of two-step import)
   */
  async completeImport(
    sessionId: string,
    conversionRates: Record<string, number>
  ): Promise<UploadResponse> {
    const transactions = parsedSessionsCache.get(sessionId);
    if (!transactions) {
      throw new Error('Session expired or invalid. Please upload files again.');
    }

    // Clean up session
    parsedSessionsCache.delete(sessionId);

    const db = getDatabase();
    return this.importTransactions(transactions, conversionRates, db, 'session-import');
  }

  /**
   * Process multiple file uploads (original one-step flow, still supported)
   * For CZK-only files, this works as before. For mixed currencies, uses default rate of 1.0.
   */
  async processUploads(files: FileUpload[], conversionRates?: Record<string, number>): Promise<UploadResponse> {
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
      const fileResult = await this.processFile(file, db, conversionRates);
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
    db: ReturnType<typeof getDatabase>,
    conversionRates?: Record<string, number>
  ): Promise<UploadResponse> {
    // Parse the file
    const transactions = await parserService.parse(file.buffer, file.filename);

    if (transactions.length === 0) {
      return {
        success: true,
        imported: 0,
        duplicates: 0,
        byBank: { CSOB: 0, Raiffeisen: 0, Revolut: 0 },
      };
    }

    return this.importTransactions(transactions, conversionRates || {}, db, file.filename);
  }

  /**
   * Import parsed transactions into database with conversion rates
   */
  private importTransactions(
    transactions: ParsedTransaction[],
    conversionRates: Record<string, number>,
    db: ReturnType<typeof getDatabase>,
    filename: string
  ): UploadResponse {
    const result: UploadResponse = {
      success: true,
      imported: 0,
      duplicates: 0,
      byBank: { CSOB: 0, Raiffeisen: 0, Revolut: 0 },
    };

    // Get categorization rules
    const rules = this.getCategoryRules(db);

    // Prepare statements
    // Include currency in deduplication to handle multi-currency correctly
    const countExisting = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE date = ? AND original_amount = ? AND description = ? AND bank = ? AND original_currency = ?
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (date, amount, description, bank, category_id, original_amount, original_currency, conversion_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUploadLog = db.prepare(`
      INSERT INTO upload_log (filename, bank, transaction_count)
      VALUES (?, ?, ?)
    `);

    // Track imported per bank for this file
    const importedByBank: Record<BankName, number> = { CSOB: 0, Raiffeisen: 0, Revolut: 0 };

    // Count occurrences of each transaction signature in the upload (now including currency)
    const uploadCounts = new Map<string, number>();
    for (const tx of transactions) {
      const currency = tx.currency || 'CZK';
      const key = `${tx.date}|${tx.amount}|${tx.description}|${tx.bank}|${currency}`;
      uploadCounts.set(key, (uploadCounts.get(key) || 0) + 1);
    }

    // Get existing counts from DB BEFORE processing (snapshot)
    const existingCounts = new Map<string, number>();
    for (const key of uploadCounts.keys()) {
      const [date, amount, description, bank, currency] = key.split('|');
      const existingResult = countExisting.get(date, parseFloat(amount), description, bank, currency) as { count: number };
      existingCounts.set(key, existingResult.count);
    }

    // Track how many of each signature we've processed
    const processedCounts = new Map<string, number>();

    // Process each transaction
    const processTransactions = db.transaction(() => {
      for (const tx of transactions) {
        const currency = tx.currency || 'CZK';
        const key = `${tx.date}|${tx.amount}|${tx.description}|${tx.bank}|${currency}`;
        const processedSoFar = processedCounts.get(key) || 0;
        const existingCount = existingCounts.get(key) || 0;
        const uploadCount = uploadCounts.get(key)!;

        // Calculate how many we should import
        const toImport = Math.max(0, uploadCount - existingCount);

        if (processedSoFar >= toImport) {
          result.duplicates++;
          processedCounts.set(key, processedSoFar + 1);
          continue;
        }

        processedCounts.set(key, processedSoFar + 1);

        // Apply categorization
        const categoryId = this.categorizeTransaction(tx, rules);

        // Calculate converted amount
        const originalAmount = tx.amount;
        const conversionRate = currency === 'CZK' ? 1.0 : (conversionRates[currency] || 1.0);
        const convertedAmount = originalAmount * conversionRate;

        // Insert transaction with currency info
        insertTransaction.run(
          tx.date,
          convertedAmount,
          tx.description,
          tx.bank,
          categoryId,
          originalAmount,
          currency,
          conversionRate
        );
        result.imported++;
        importedByBank[tx.bank]++;
      }

      // Log the upload if any transactions were imported
      if (result.imported > 0 && transactions.length > 0) {
        const bank = transactions[0].bank;
        insertUploadLog.run(filename, bank, result.imported);
      }
    });

    processTransactions();
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
