import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// Set test database path before importing database module
const TEST_DB_PATH = path.join(__dirname, '../data/test-spending.db');
process.env.DB_PATH = TEST_DB_PATH;

import { getDatabase, closeDatabase, resetDatabase, DEFAULT_CATEGORIES, getDbPath } from '../src/db/database';

describe('Database', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    // Clean up test database files
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    const walPath = TEST_DB_PATH + '-wal';
    const shmPath = TEST_DB_PATH + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('getDatabase', () => {
    it('should create database file', () => {
      getDatabase();
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should return the same database instance on multiple calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });
  });

  describe('Tables', () => {
    it('should create categories table with correct schema', () => {
      const db = getDatabase();
      const tableInfo = db.prepare("PRAGMA table_info(categories)").all() as Array<{ name: string; type: string; notnull: number }>;

      const columns = tableInfo.map(col => col.name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('color');
    });

    it('should create transactions table with correct schema', () => {
      const db = getDatabase();
      const tableInfo = db.prepare("PRAGMA table_info(transactions)").all() as Array<{ name: string; type: string; notnull: number }>;

      const columns = tableInfo.map(col => col.name);
      expect(columns).toContain('id');
      expect(columns).toContain('date');
      expect(columns).toContain('amount');
      expect(columns).toContain('description');
      expect(columns).toContain('bank');
      expect(columns).toContain('category_id');
      expect(columns).toContain('created_at');
    });

    it('should create category_rules table with correct schema', () => {
      const db = getDatabase();
      const tableInfo = db.prepare("PRAGMA table_info(category_rules)").all() as Array<{ name: string; type: string; notnull: number }>;

      const columns = tableInfo.map(col => col.name);
      expect(columns).toContain('id');
      expect(columns).toContain('keyword');
      expect(columns).toContain('category_id');
      expect(columns).toContain('created_at');
    });

    it('should create upload_log table with correct schema', () => {
      const db = getDatabase();
      const tableInfo = db.prepare("PRAGMA table_info(upload_log)").all() as Array<{ name: string; type: string; notnull: number }>;

      const columns = tableInfo.map(col => col.name);
      expect(columns).toContain('id');
      expect(columns).toContain('filename');
      expect(columns).toContain('bank');
      expect(columns).toContain('transaction_count');
      expect(columns).toContain('upload_date');
    });
  });

  describe('Default Categories', () => {
    it('should seed all default categories on first run', () => {
      const db = getDatabase();
      const categories = db.prepare('SELECT * FROM categories ORDER BY id').all() as Array<{ id: number; name: string; color: string }>;

      expect(categories.length).toBe(DEFAULT_CATEGORIES.length);

      DEFAULT_CATEGORIES.forEach((expected, index) => {
        expect(categories[index].name).toBe(expected.name);
        expect(categories[index].color).toBe(expected.color);
      });
    });

    it('should not duplicate categories on subsequent runs', () => {
      const db = getDatabase();
      closeDatabase();

      // Get database again (simulates restart)
      const db2 = getDatabase();
      const categories = db2.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };

      expect(categories.count).toBe(DEFAULT_CATEGORIES.length);
    });
  });

  describe('Indexes', () => {
    it('should create indexes for common queries', () => {
      const db = getDatabase();
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='transactions'").all() as Array<{ name: string }>;

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_transactions_date');
      expect(indexNames).toContain('idx_transactions_bank');
      expect(indexNames).toContain('idx_transactions_category_id');
      expect(indexNames).toContain('idx_transactions_date_bank');
    });

    it('should create index for category_rules keyword', () => {
      const db = getDatabase();
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='category_rules'").all() as Array<{ name: string }>;

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_category_rules_keyword');
    });
  });

  describe('Foreign Keys', () => {
    it('should enforce foreign key constraints', () => {
      const db = getDatabase();

      // Try to insert a transaction with non-existent category_id
      expect(() => {
        db.prepare('INSERT INTO transactions (date, amount, description, bank, category_id) VALUES (?, ?, ?, ?, ?)')
          .run('2024-01-01', -100, 'Test', 'CSOB', 999);
      }).toThrow();
    });

    it('should set category_id to NULL when category is deleted', () => {
      const db = getDatabase();

      // Insert a transaction with a valid category
      const categoryId = (db.prepare('SELECT id FROM categories WHERE name = ?').get('Food') as { id: number }).id;
      db.prepare('INSERT INTO transactions (date, amount, description, bank, category_id) VALUES (?, ?, ?, ?, ?)')
        .run('2024-01-01', -100, 'Test Food', 'CSOB', categoryId);

      // Delete the category
      db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

      // Check that transaction category_id is now NULL
      const transaction = db.prepare('SELECT category_id FROM transactions WHERE description = ?').get('Test Food') as { category_id: number | null };
      expect(transaction.category_id).toBeNull();
    });
  });

  describe('Bank Constraint', () => {
    it('should only allow valid bank values', () => {
      const db = getDatabase();

      // Valid banks should work
      expect(() => {
        db.prepare('INSERT INTO transactions (date, amount, description, bank) VALUES (?, ?, ?, ?)')
          .run('2024-01-01', -100, 'Test1', 'CSOB');
      }).not.toThrow();

      expect(() => {
        db.prepare('INSERT INTO transactions (date, amount, description, bank) VALUES (?, ?, ?, ?)')
          .run('2024-01-01', -100, 'Test2', 'Raiffeisen');
      }).not.toThrow();

      expect(() => {
        db.prepare('INSERT INTO transactions (date, amount, description, bank) VALUES (?, ?, ?, ?)')
          .run('2024-01-01', -100, 'Test3', 'Revolut');
      }).not.toThrow();

      // Invalid bank should fail
      expect(() => {
        db.prepare('INSERT INTO transactions (date, amount, description, bank) VALUES (?, ?, ?, ?)')
          .run('2024-01-01', -100, 'Test4', 'InvalidBank');
      }).toThrow();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent reads', () => {
      const db = getDatabase();

      // Insert some test data
      db.prepare('INSERT INTO transactions (date, amount, description, bank) VALUES (?, ?, ?, ?)')
        .run('2024-01-01', -100, 'Test', 'CSOB');

      // Perform multiple concurrent reads
      const results = Promise.all([
        Promise.resolve(db.prepare('SELECT * FROM transactions').all()),
        Promise.resolve(db.prepare('SELECT * FROM categories').all()),
        Promise.resolve(db.prepare('SELECT COUNT(*) FROM transactions').get()),
      ]);

      return expect(results).resolves.toBeDefined();
    });

    it('should use WAL mode for better concurrency', () => {
      const db = getDatabase();
      const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
      expect(result[0].journal_mode).toBe('wal');
    });
  });
});
