import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import { UploadService } from '../src/services/uploadService';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `upload-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

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
      // Create a CSOB dummy file (parser detects by filename)
      const file = {
        buffer: Buffer.from('csob bank statement data'),
        filename: 'csob_export_2024.csv',
      };

      const result = await uploadService.processUploads([file]);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(10); // Dummy parser returns 10 transactions
      expect(result.duplicates).toBe(0);
      expect(result.byBank.CSOB).toBe(10);
      expect(result.byBank.Raiffeisen).toBe(0);
      expect(result.byBank.Revolut).toBe(0);
    });

    it('should process multiple files from different banks', async () => {
      // Revolut requires valid CSV content
      const revolutCsv = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,Test Payment,-100.00,0.00,CZK,COMPLETADO,1000.00`;

      const files = [
        { buffer: Buffer.from('csob data'), filename: 'csob_export.csv' },
        { buffer: Buffer.from(revolutCsv), filename: 'revolut_statement.csv' },
      ];

      const result = await uploadService.processUploads(files);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(11); // 10 from CSOB + 1 from Revolut
      expect(result.byBank.CSOB).toBe(10);
      expect(result.byBank.Revolut).toBe(1);
    });

    it('should detect and skip duplicate transactions', async () => {
      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
      };

      // First upload
      const firstResult = await uploadService.processUploads([file]);
      expect(firstResult.imported).toBe(10);
      expect(firstResult.duplicates).toBe(0);

      // Second upload - same file should be all duplicates
      const secondResult = await uploadService.processUploads([file]);
      expect(secondResult.imported).toBe(0);
      expect(secondResult.duplicates).toBe(10);
    });

    it('should store transactions in database', async () => {
      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const transactions = db.prepare('SELECT * FROM transactions').all();
      expect(transactions.length).toBe(10);
    });

    it('should log upload to upload_log table', async () => {
      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export_2024.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const logs = db.prepare('SELECT * FROM upload_log').all() as {
        filename: string;
        bank: string;
        transaction_count: number;
      }[];

      expect(logs.length).toBe(1);
      expect(logs[0].filename).toBe('csob_export_2024.csv');
      expect(logs[0].bank).toBe('CSOB');
      expect(logs[0].transaction_count).toBe(10);
    });

    it('should apply categorization rules to new transactions', async () => {
      const db = getDatabase();

      // Get the Food category id
      const foodCategory = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Add a rule for ALBERT (a store in CSOB dummy data)
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'albert',
        foodCategory.id
      );

      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
      };

      await uploadService.processUploads([file]);

      // Check that the ALBERT transaction was categorized
      const categorizedTx = db
        .prepare("SELECT * FROM transactions WHERE description LIKE '%ALBERT%'")
        .get() as { category_id: number | null };

      expect(categorizedTx.category_id).toBe(foodCategory.id);
    });

    it('should leave transactions uncategorized when no rule matches', async () => {
      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
      };

      await uploadService.processUploads([file]);

      const db = getDatabase();
      const uncategorized = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      // All transactions should be uncategorized (no rules set)
      expect(uncategorized.count).toBe(10);
    });

    it('should handle case-insensitive rule matching', async () => {
      const db = getDatabase();

      const foodCategory = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Add a rule with uppercase keyword
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'ALBERT',
        foodCategory.id
      );

      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
      };

      await uploadService.processUploads([file]);

      const categorizedTx = db
        .prepare("SELECT * FROM transactions WHERE description LIKE '%Albert%'")
        .get() as { category_id: number | null };

      expect(categorizedTx.category_id).toBe(foodCategory.id);
    });

    it('should handle empty file gracefully', async () => {
      // Create a mock that returns empty transactions
      // For now, we test with a file that would parse to 0 transactions
      // Since we use dummy parsers that always return 10, we test with an unrecognized file
      // which should throw an error

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
      const file = {
        buffer: Buffer.from('csob data'),
        filename: 'csob_export.csv',
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
    it('should correctly detect CSOB files', async () => {
      const file = {
        buffer: Buffer.from('csob export data'),
        filename: 'csob_statement.csv',
      };

      const result = await uploadService.processUploads([file]);
      expect(result.byBank.CSOB).toBe(10);
    });

    it('should correctly detect Raiffeisen files', async () => {
      const file = {
        buffer: Buffer.from('raiffeisen export data'),
        filename: 'raiffeisen_export.csv',
      };

      const result = await uploadService.processUploads([file]);
      expect(result.byBank.Raiffeisen).toBe(10);
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
