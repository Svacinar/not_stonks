import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import { UploadService } from '../src/services/uploadService';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `upload-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

// Path to test files (use generic names - actual files are gitignored)
const TEST_CSOB_PDF = join(__dirname, '../test-statements/csob-statement.pdf');
const TEST_RAIFFEISEN_PDF = join(__dirname, '../test-statements/raiffeisen-statement.pdf');

// Helper to create Revolut CSV content for testing
const createRevolutCsv = (transactions: { date: string; description: string; amount: number }[]) => {
  const header = 'Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo';
  const rows = transactions.map((tx, i) => {
    const balance = 1000 - i * 100;
    return `Pago con tarjeta,Actual,${tx.date} 00:00:00,${tx.date} 01:00:00,${tx.description},${tx.amount.toFixed(2)},0.00,CZK,COMPLETADO,${balance.toFixed(2)}`;
  });
  return [header, ...rows].join('\n');
};

describe('UploadService', () => {
  let uploadService: UploadService;

  beforeEach(() => {
    resetDatabase();
    uploadService = new UploadService();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('processUploads', () => {
    it('should process a single file and import transactions', async () => {
      // Use Revolut CSV with 5 transactions
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Merchant 1', amount: -100 },
        { date: '2025-01-02', description: 'Merchant 2', amount: -200 },
        { date: '2025-01-03', description: 'Merchant 3', amount: -300 },
        { date: '2025-01-04', description: 'Merchant 4', amount: -400 },
        { date: '2025-01-05', description: 'Merchant 5', amount: -500 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export_2025.csv',
      };

      const result = await uploadService.processUploads([file]);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(5);
      expect(result.duplicates).toBe(0);
      expect(result.byBank.Revolut).toBe(5);
      expect(result.byBank.CSOB).toBe(0);
      expect(result.byBank.Raiffeisen).toBe(0);
    });

    it('should process multiple files from different banks', async () => {
      const revolutCsv1 = createRevolutCsv([
        { date: '2025-01-01', description: 'Revolut Merchant 1', amount: -100 },
        { date: '2025-01-02', description: 'Revolut Merchant 2', amount: -200 },
      ]);
      const revolutCsv2 = createRevolutCsv([
        { date: '2025-02-01', description: 'Revolut Merchant 3', amount: -300 },
      ]);

      const files = [
        { buffer: Buffer.from(revolutCsv1), filename: 'revolut_jan.csv' },
        { buffer: Buffer.from(revolutCsv2), filename: 'revolut_feb.csv' },
      ];

      const result = await uploadService.processUploads(files);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(result.byBank.Revolut).toBe(3);
    });

    it('should detect and skip duplicate transactions', async () => {
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Test Merchant', amount: -100 },
        { date: '2025-01-02', description: 'Test Merchant 2', amount: -200 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      // First upload
      const firstResult = await uploadService.processUploads([file]);
      expect(firstResult.imported).toBe(2);
      expect(firstResult.duplicates).toBe(0);

      // Second upload - same file should be all duplicates
      const secondResult = await uploadService.processUploads([file]);
      expect(secondResult.imported).toBe(0);
      expect(secondResult.duplicates).toBe(2);
    });

    it('should store transactions in database', async () => {
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'DB Test 1', amount: -100 },
        { date: '2025-01-02', description: 'DB Test 2', amount: -200 },
        { date: '2025-01-03', description: 'DB Test 3', amount: -300 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const transactions = db.prepare('SELECT * FROM transactions').all();
      expect(transactions.length).toBe(3);
    });

    it('should log upload to upload_log table', async () => {
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Log Test', amount: -100 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export_2025.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const logs = db.prepare('SELECT * FROM upload_log').all() as {
        filename: string;
        bank: string;
        transaction_count: number;
      }[];

      expect(logs.length).toBe(1);
      expect(logs[0].filename).toBe('revolut_export_2025.csv');
      expect(logs[0].bank).toBe('Revolut');
      expect(logs[0].transaction_count).toBe(1);
    });

    it('should apply categorization rules to new transactions', async () => {
      const db = getDatabase();

      // Get the Food category id
      const foodCategory = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Add a rule for TESCO
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'tesco',
        foodCategory.id
      );

      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'TESCO Store', amount: -100 },
        { date: '2025-01-02', description: 'Other Store', amount: -200 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      await uploadService.processUploads([file]);

      // Check that the TESCO transaction was categorized
      const categorizedTx = db
        .prepare("SELECT * FROM transactions WHERE description LIKE '%TESCO%'")
        .get() as { category_id: number | null };

      expect(categorizedTx.category_id).toBe(foodCategory.id);
    });

    it('should leave transactions uncategorized when no rule matches', async () => {
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Random Store 1', amount: -100 },
        { date: '2025-01-02', description: 'Random Store 2', amount: -200 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const uncategorized = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      // All transactions should be uncategorized (no rules set)
      expect(uncategorized.count).toBe(2);
    });

    it('should handle case-insensitive rule matching', async () => {
      const db = getDatabase();

      const foodCategory = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Add a rule with uppercase keyword
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'TESCO',
        foodCategory.id
      );

      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Tesco Supermarket', amount: -100 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      await uploadService.processUploads([file]);

      const categorizedTx = db
        .prepare("SELECT * FROM transactions WHERE description LIKE '%Tesco%'")
        .get() as { category_id: number | null };

      expect(categorizedTx.category_id).toBe(foodCategory.id);
    });

    it('should handle empty file gracefully', async () => {
      const file = {
        buffer: Buffer.from('random data'),
        filename: 'unknown_file.csv',
      };

      // This should throw because the bank cannot be detected
      await expect(uploadService.processUploads([file])).rejects.toThrow(
        /Unable to detect bank type/
      );
    });

    it('should not log upload when no transactions imported', async () => {
      const csvContent = createRevolutCsv([
        { date: '2025-01-01', description: 'Duplicate Test', amount: -100 },
      ]);
      const file = {
        buffer: Buffer.from(csvContent),
        filename: 'revolut_export.csv',
      };

      // First upload
      await uploadService.processUploads([file]);

      // Second upload - all duplicates, should not create new log entry
      await uploadService.processUploads([file]);

      const db = getDatabase();
      const logs = db.prepare('SELECT * FROM upload_log').all();

      // Only one log entry from first upload
      expect(logs.length).toBe(1);
    });
  });

  describe('Bank detection and parsing', () => {
    it.skipIf(!existsSync(TEST_CSOB_PDF))('should correctly detect CSOB PDF files', async () => {
      const file = {
        buffer: readFileSync(TEST_CSOB_PDF),
        filename: 'csob-statement.pdf',
      };

      const result = await uploadService.processUploads([file]);
      // All 26 transactions imported (even identical same-day purchases)
      expect(result.byBank.CSOB).toBe(26);
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('should correctly detect Raiffeisen PDF files', async () => {
      const file = {
        buffer: readFileSync(TEST_RAIFFEISEN_PDF),
        filename: 'raiffeisen-statement.pdf',
      };

      const result = await uploadService.processUploads([file]);
      expect(result.byBank.Raiffeisen).toBe(16);
    });

    it('should correctly detect Revolut files', async () => {
      // Revolut requires valid CSV content
      const revolutCsv = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,Netflix,-15.99,0.00,EUR,COMPLETADO,500.00
Recargas,Actual,2025-12-11 07:14:19,2025-12-11 07:14:20,Top-up,1000.00,0.00,EUR,COMPLETADO,1500.00`;

      const file = {
        buffer: Buffer.from(revolutCsv),
        filename: 'revolut_statement.csv',
      };

      const result = await uploadService.processUploads([file]);
      expect(result.byBank.Revolut).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported bank format', async () => {
      const file = {
        buffer: Buffer.from('unknown format'),
        filename: 'random_bank.csv',
      };

      await expect(uploadService.processUploads([file])).rejects.toThrow();
    });
  });
});
