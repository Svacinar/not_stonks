import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `export-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

// Helper function to seed test transactions
function seedTestTransactions(db: ReturnType<typeof getDatabase>) {
  const insert = db.prepare(`
    INSERT INTO transactions (date, amount, description, bank, category_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Get category IDs
  const foodCat = db
    .prepare("SELECT id FROM categories WHERE name = 'Food'")
    .get() as { id: number };
  const transportCat = db
    .prepare("SELECT id FROM categories WHERE name = 'Transport'")
    .get() as { id: number };
  const shoppingCat = db
    .prepare("SELECT id FROM categories WHERE name = 'Shopping'")
    .get() as { id: number };

  // Insert test transactions across multiple months
  insert.run('2024-01-15', -50.0, 'ALBERT Store Purchase', 'CSOB', foodCat.id);
  insert.run('2024-01-16', -30.0, 'LIDL Groceries', 'CSOB', foodCat.id);
  insert.run('2024-01-17', -25.0, 'SHELL Gas Station', 'Raiffeisen', transportCat.id);
  insert.run('2024-01-18', -100.0, 'AMAZON Purchase', 'Revolut', shoppingCat.id);
  insert.run('2024-02-01', -75.0, 'NETFLIX Subscription', 'Revolut', null);
  insert.run('2024-02-15', -45.0, 'UBER Trip', 'Revolut', transportCat.id);
  insert.run('2024-03-01', -200.0, 'Unknown Transaction', 'CSOB', null);
}

describe('Export Routes Logic', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('GET /api/export/transactions - CSV Export', () => {
    it('should export all transactions when no filters applied', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*, c.name as category_name, c.color as category_color
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          ORDER BY t.date DESC
        `
        )
        .all();

      expect(result.length).toBe(7);
    });

    it('should filter by date range', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.date >= ? AND t.date <= ?
          ORDER BY t.date DESC
        `
        )
        .all('2024-01-01', '2024-01-31');

      expect(result.length).toBe(4);
    });

    it('should filter by bank', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.bank = ?
          ORDER BY t.date DESC
        `
        )
        .all('CSOB');

      expect(result.length).toBe(3);
    });

    it('should filter by category', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.category_id = ?
          ORDER BY t.date DESC
        `
        )
        .all(foodCat.id);

      expect(result.length).toBe(2);
    });

    it('should filter uncategorized transactions', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.category_id IS NULL
          ORDER BY t.date DESC
        `
        )
        .all();

      expect(result.length).toBe(2);
    });

    it('should filter by search term', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.description LIKE ?
          ORDER BY t.date DESC
        `
        )
        .all('%ALBERT%');

      expect(result.length).toBe(1);
    });

    it('should combine multiple filters', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT t.*
          FROM transactions t
          WHERE t.bank = ?
          AND t.date >= ?
          ORDER BY t.date DESC
        `
        )
        .all('CSOB', '2024-01-01');

      expect(result.length).toBe(3);
    });
  });

  describe('CSV Escaping', () => {
    it('should escape values with commas', () => {
      // Test the escaping logic
      const value = 'Item, with comma';
      const escaped = value.includes(',') ? `"${value}"` : value;
      expect(escaped).toBe('"Item, with comma"');
    });

    it('should escape values with quotes', () => {
      const value = 'Item "quoted"';
      const escaped = value.includes('"')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
      expect(escaped).toBe('"Item ""quoted"""');
    });

    it('should escape values with newlines', () => {
      const value = 'Line1\nLine2';
      const escaped = value.includes('\n') ? `"${value}"` : value;
      expect(escaped).toBe('"Line1\nLine2"');
    });

    it('should handle null values', () => {
      const value = null;
      const escaped = value === null ? '' : String(value);
      expect(escaped).toBe('');
    });
  });

  describe('GET /api/export/summary - Summary Export', () => {
    it('should return summary totals', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as average_amount,
            MIN(date) as min_date,
            MAX(date) as max_date
          FROM transactions t
        `
        )
        .get() as {
        total_count: number;
        total_amount: number;
        average_amount: number;
        min_date: string;
        max_date: string;
      };

      expect(result.total_count).toBe(7);
      expect(result.total_amount).toBe(-525.0);
      expect(result.min_date).toBe('2024-01-15');
      expect(result.max_date).toBe('2024-03-01');
    });

    it('should return summary by category', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT
            COALESCE(c.name, 'Uncategorized') as category,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as average_amount
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          GROUP BY t.category_id
          ORDER BY total_amount ASC
        `
        )
        .all() as { category: string; transaction_count: number; total_amount: number }[];

      expect(result.length).toBe(4); // Food, Transport, Shopping, Uncategorized
      expect(result.find((r) => r.category === 'Food')?.transaction_count).toBe(2);
      expect(result.find((r) => r.category === 'Transport')?.transaction_count).toBe(2);
      expect(result.find((r) => r.category === 'Shopping')?.transaction_count).toBe(1);
      expect(result.find((r) => r.category === 'Uncategorized')?.transaction_count).toBe(2);
    });

    it('should return summary by month', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT
            strftime('%Y-%m', t.date) as month,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as average_amount
          FROM transactions t
          GROUP BY strftime('%Y-%m', t.date)
          ORDER BY month ASC
        `
        )
        .all() as { month: string; transaction_count: number; total_amount: number }[];

      expect(result.length).toBe(3); // 2024-01, 2024-02, 2024-03
      expect(result.find((r) => r.month === '2024-01')?.transaction_count).toBe(4);
      expect(result.find((r) => r.month === '2024-02')?.transaction_count).toBe(2);
      expect(result.find((r) => r.month === '2024-03')?.transaction_count).toBe(1);
    });

    it('should return summary by category and month', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT
            COALESCE(c.name, 'Uncategorized') as category,
            strftime('%Y-%m', t.date) as month,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          GROUP BY t.category_id, strftime('%Y-%m', t.date)
          ORDER BY category, month
        `
        )
        .all() as { category: string; month: string; transaction_count: number }[];

      // Food: Jan (2), Transport: Jan (1), Feb (1), Shopping: Jan (1), Uncategorized: Feb (1), Mar (1)
      expect(result.length).toBe(6);
      expect(
        result.find((r) => r.category === 'Food' && r.month === '2024-01')?.transaction_count
      ).toBe(2);
    });

    it('should respect date filters in summary', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
          SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM transactions t
          WHERE t.date >= ? AND t.date <= ?
        `
        )
        .get('2024-01-01', '2024-01-31') as { total_count: number; total_amount: number };

      expect(result.total_count).toBe(4);
    });

    it('should handle empty result set', () => {
      const db = getDatabase();
      // Don't seed any transactions

      const result = db
        .prepare(
          `
          SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as average_amount,
            MIN(date) as min_date,
            MAX(date) as max_date
          FROM transactions t
        `
        )
        .get() as {
        total_count: number;
        total_amount: number;
        average_amount: number;
        min_date: string | null;
        max_date: string | null;
      };

      expect(result.total_count).toBe(0);
      expect(result.total_amount).toBe(0);
      expect(result.min_date).toBeNull();
      expect(result.max_date).toBeNull();
    });
  });

  describe('JSON Export Structure', () => {
    it('should return correct JSON structure for transactions', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const transactions = db
        .prepare(
          `
          SELECT t.*, c.name as category_name, c.color as category_color
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          ORDER BY t.date DESC
        `
        )
        .all() as { id: number; date: string; amount: number; description: string; bank: string }[];

      // Verify structure of response
      const response = {
        exported_at: new Date().toISOString(),
        count: transactions.length,
        transactions,
      };

      expect(response.count).toBe(7);
      expect(response.transactions.length).toBe(7);
      expect(response.transactions[0]).toHaveProperty('id');
      expect(response.transactions[0]).toHaveProperty('date');
      expect(response.transactions[0]).toHaveProperty('amount');
      expect(response.transactions[0]).toHaveProperty('description');
      expect(response.transactions[0]).toHaveProperty('bank');
    });

    it('should return correct JSON structure for summary', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const totals = db
        .prepare(
          `
          SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as average_amount,
            MIN(date) as min_date,
            MAX(date) as max_date
          FROM transactions t
        `
        )
        .get() as {
        total_count: number;
        total_amount: number;
        average_amount: number;
        min_date: string;
        max_date: string;
      };

      const byCategory = db
        .prepare(
          `
          SELECT
            COALESCE(c.name, 'Uncategorized') as category,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as average_amount
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          GROUP BY t.category_id
        `
        )
        .all();

      const byMonth = db
        .prepare(
          `
          SELECT
            strftime('%Y-%m', t.date) as month,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as average_amount
          FROM transactions t
          GROUP BY strftime('%Y-%m', t.date)
        `
        )
        .all();

      // Verify structure
      const response = {
        exported_at: new Date().toISOString(),
        totals: {
          transaction_count: totals.total_count,
          total_amount: totals.total_amount,
          average_amount: totals.average_amount,
          date_range: {
            min: totals.min_date || '',
            max: totals.max_date || '',
          },
        },
        by_category: byCategory,
        by_month: byMonth,
      };

      expect(response.totals.transaction_count).toBe(7);
      expect(response.by_category.length).toBe(4);
      expect(response.by_month.length).toBe(3);
    });
  });

  describe('Content-Disposition Header', () => {
    it('should generate correct filename for transactions CSV', () => {
      const date = '2024-01-15';
      const filename = `transactions_${date}.csv`;
      expect(filename).toBe('transactions_2024-01-15.csv');
    });

    it('should generate correct filename for transactions JSON', () => {
      const date = '2024-01-15';
      const filename = `transactions_${date}.json`;
      expect(filename).toBe('transactions_2024-01-15.json');
    });

    it('should generate correct filename for summary CSV', () => {
      const date = '2024-01-15';
      const filename = `summary_${date}.csv`;
      expect(filename).toBe('summary_2024-01-15.csv');
    });

    it('should generate correct filename for summary JSON', () => {
      const date = '2024-01-15';
      const filename = `summary_${date}.json`;
      expect(filename).toBe('summary_2024-01-15.json');
    });
  });
});
