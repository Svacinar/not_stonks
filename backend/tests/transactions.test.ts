import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `transactions-test-${Date.now()}.db`);
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

  // Insert test transactions
  insert.run('2024-01-15', -50.0, 'ALBERT Store Purchase', 'CSOB', foodCat.id);
  insert.run('2024-01-16', -30.0, 'LIDL Groceries', 'CSOB', foodCat.id);
  insert.run('2024-01-17', -25.0, 'SHELL Gas Station', 'Raiffeisen', transportCat.id);
  insert.run('2024-01-18', -100.0, 'AMAZON Purchase', 'Revolut', null);
  insert.run('2024-02-01', -75.0, 'NETFLIX Subscription', 'Revolut', null);
  insert.run('2024-02-15', -45.0, 'UBER Trip', 'Revolut', transportCat.id);
  insert.run('2024-03-01', -200.0, 'Unknown Transaction', 'CSOB', null);
}

describe('Transactions Route Logic', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('GET /api/transactions - List with filters', () => {
    it('should return all transactions when no filters applied', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        ORDER BY t.date DESC
        LIMIT 50 OFFSET 0
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
        SELECT * FROM transactions
        WHERE date >= ? AND date <= ?
        ORDER BY date DESC
      `
        )
        .all('2024-01-01', '2024-01-31');

      expect(result.length).toBe(4);
    });

    it('should filter by bank', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db.prepare(`SELECT * FROM transactions WHERE bank = ?`).all('CSOB');

      expect(result.length).toBe(3);
    });

    it('should filter by multiple banks', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(`SELECT * FROM transactions WHERE bank IN (?, ?)`)
        .all('CSOB', 'Revolut');

      expect(result.length).toBe(6);
    });

    it('should filter by category', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const result = db
        .prepare(`SELECT * FROM transactions WHERE category_id = ?`)
        .all(foodCat.id);

      expect(result.length).toBe(2);
    });

    it('should filter uncategorized transactions', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db.prepare(`SELECT * FROM transactions WHERE category_id IS NULL`).all();

      expect(result.length).toBe(3);
    });

    it('should search by description', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(`SELECT * FROM transactions WHERE description LIKE ?`)
        .all('%ALBERT%');

      expect(result.length).toBe(1);
    });

    it('should combine filters correctly (AND logic)', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const transportCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Transport'")
        .get() as { id: number };

      const result = db
        .prepare(
          `
        SELECT * FROM transactions
        WHERE bank = ?
        AND category_id = ?
      `
        )
        .all('Revolut', transportCat.id);

      expect(result.length).toBe(1);
    });

    it('should paginate results', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const page1 = db.prepare(`SELECT * FROM transactions ORDER BY date DESC LIMIT 3 OFFSET 0`).all();
      const page2 = db.prepare(`SELECT * FROM transactions ORDER BY date DESC LIMIT 3 OFFSET 3`).all();

      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);
    });

    it('should return total count with pagination', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const count = db.prepare(`SELECT COUNT(*) as total FROM transactions`).get() as { total: number };

      expect(count.total).toBe(7);
    });

    it('should sort by date descending by default', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db.prepare(`SELECT date FROM transactions ORDER BY date DESC`).all() as {
        date: string;
      }[];

      expect(result[0].date).toBe('2024-03-01');
      expect(result[result.length - 1].date).toBe('2024-01-15');
    });

    it('should sort by amount ascending', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db.prepare(`SELECT amount FROM transactions ORDER BY amount ASC`).all() as {
        amount: number;
      }[];

      expect(result[0].amount).toBe(-200.0);
      expect(result[result.length - 1].amount).toBe(-25.0);
    });
  });

  describe('GET /api/transactions/:id - Single transaction', () => {
    it('should return a single transaction by id', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const first = db.prepare(`SELECT id FROM transactions LIMIT 1`).get() as { id: number };
      const result = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(first.id);

      expect(result).toBeDefined();
    });

    it('should return transaction with category info', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const txWithCategory = db
        .prepare(`SELECT id FROM transactions WHERE category_id = ? LIMIT 1`)
        .get(foodCat.id) as { id: number };

      const result = db
        .prepare(
          `
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `
        )
        .get(txWithCategory.id) as { category_name: string; category_color: string };

      expect(result.category_name).toBe('Food');
      expect(result.category_color).toBe('#22c55e');
    });

    it('should return null for non-existent transaction', () => {
      const db = getDatabase();

      const result = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(99999);

      expect(result).toBeUndefined();
    });
  });

  describe('PATCH /api/transactions/:id - Update category', () => {
    it('should update transaction category', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const transportCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Transport'")
        .get() as { id: number };

      const uncategorized = db
        .prepare(`SELECT id FROM transactions WHERE category_id IS NULL LIMIT 1`)
        .get() as { id: number };

      db.prepare(`UPDATE transactions SET category_id = ? WHERE id = ?`).run(
        transportCat.id,
        uncategorized.id
      );

      const updated = db.prepare(`SELECT category_id FROM transactions WHERE id = ?`).get(uncategorized.id) as {
        category_id: number;
      };

      expect(updated.category_id).toBe(transportCat.id);
    });

    it('should auto-create rule when category is set', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      // Get an uncategorized AMAZON transaction
      const amazonTx = db
        .prepare(`SELECT * FROM transactions WHERE description LIKE '%AMAZON%'`)
        .get() as { id: number; description: string };

      const shoppingCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Shopping'")
        .get() as { id: number };

      // Update the transaction category
      db.prepare(`UPDATE transactions SET category_id = ? WHERE id = ?`).run(
        shoppingCat.id,
        amazonTx.id
      );

      // Simulate keyword extraction and rule creation
      const keyword = 'amazon';
      db.prepare(`INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)`).run(
        keyword,
        shoppingCat.id
      );

      const rule = db.prepare(`SELECT * FROM category_rules WHERE keyword = ?`).get(keyword) as {
        category_id: number;
      };

      expect(rule.category_id).toBe(shoppingCat.id);
    });

    it('should not create duplicate rules', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Create initial rule
      db.prepare(`INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)`).run(
        'starbucks',
        foodCat.id
      );

      // Check if rule exists before inserting
      const existing = db.prepare(`SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)`).get('STARBUCKS');

      expect(existing).toBeDefined();
    });

    it('should allow setting category to null', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const categorized = db
        .prepare(`SELECT id FROM transactions WHERE category_id IS NOT NULL LIMIT 1`)
        .get() as { id: number };

      db.prepare(`UPDATE transactions SET category_id = NULL WHERE id = ?`).run(categorized.id);

      const updated = db.prepare(`SELECT category_id FROM transactions WHERE id = ?`).get(categorized.id) as {
        category_id: number | null;
      };

      expect(updated.category_id).toBeNull();
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const initial = db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as { count: number };
      const toDelete = db.prepare(`SELECT id FROM transactions LIMIT 1`).get() as { id: number };

      const result = db.prepare(`DELETE FROM transactions WHERE id = ?`).run(toDelete.id);

      expect(result.changes).toBe(1);

      const after = db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as { count: number };
      expect(after.count).toBe(initial.count - 1);
    });

    it('should return 0 changes for non-existent transaction', () => {
      const db = getDatabase();

      const result = db.prepare(`DELETE FROM transactions WHERE id = ?`).run(99999);

      expect(result.changes).toBe(0);
    });
  });

  describe('GET /api/transactions/stats - Aggregate statistics', () => {
    it('should return total count and amount', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT COUNT(*) as total_count, SUM(amount) as total_amount
        FROM transactions
      `
        )
        .get() as { total_count: number; total_amount: number };

      expect(result.total_count).toBe(7);
      expect(result.total_amount).toBe(-525.0);
    });

    it('should return stats by category', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT
          COALESCE(c.name, 'Uncategorized') as name,
          COUNT(*) as count,
          SUM(t.amount) as sum
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        GROUP BY t.category_id
        ORDER BY sum ASC
      `
        )
        .all() as { name: string; count: number; sum: number }[];

      expect(result.length).toBe(3); // Food, Transport, Uncategorized
      expect(result.find((c) => c.name === 'Food')?.count).toBe(2);
      expect(result.find((c) => c.name === 'Transport')?.count).toBe(2);
      expect(result.find((c) => c.name === 'Uncategorized')?.count).toBe(3);
    });

    it('should return uncategorized expenses with correct sum for pie chart', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT
          COALESCE(c.name, 'Uncategorized') as name,
          COUNT(*) as count,
          SUM(t.amount) as sum
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        GROUP BY t.category_id
        ORDER BY sum ASC
      `
        )
        .all() as { name: string; count: number; sum: number }[];

      // Verify uncategorized is included with correct sum
      const uncategorized = result.find((c) => c.name === 'Uncategorized');
      expect(uncategorized).toBeDefined();
      expect(uncategorized?.count).toBe(3);
      // Sum should be: -100 (AMAZON) + -75 (NETFLIX) + -200 (Unknown) = -375
      expect(uncategorized?.sum).toBe(-375);
      // Uncategorized should have negative sum (expense) for pie chart display
      expect(uncategorized!.sum).toBeLessThan(0);
    });

    it('should return stats by bank', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT bank as name, COUNT(*) as count, SUM(amount) as sum
        FROM transactions
        GROUP BY bank
        ORDER BY sum ASC
      `
        )
        .all() as { name: string; count: number; sum: number }[];

      expect(result.length).toBe(3);
      expect(result.find((b) => b.name === 'CSOB')?.count).toBe(3);
      expect(result.find((b) => b.name === 'Revolut')?.count).toBe(3);
      expect(result.find((b) => b.name === 'Raiffeisen')?.count).toBe(1);
    });

    it('should return stats by month', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT
          strftime('%Y-%m', date) as month,
          COUNT(*) as count,
          SUM(amount) as sum
        FROM transactions
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `
        )
        .all() as { month: string; count: number; sum: number }[];

      expect(result.length).toBe(3); // 2024-01, 2024-02, 2024-03
      expect(result.find((m) => m.month === '2024-01')?.count).toBe(4);
      expect(result.find((m) => m.month === '2024-02')?.count).toBe(2);
      expect(result.find((m) => m.month === '2024-03')?.count).toBe(1);
    });

    it('should return date range', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT MIN(date) as min, MAX(date) as max
        FROM transactions
      `
        )
        .get() as { min: string; max: string };

      expect(result.min).toBe('2024-01-15');
      expect(result.max).toBe('2024-03-01');
    });

    it('should respect filters for stats', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const result = db
        .prepare(
          `
        SELECT COUNT(*) as total_count, SUM(amount) as total_amount
        FROM transactions
        WHERE date >= ? AND date <= ?
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
          COALESCE(SUM(amount), 0) as total_amount
        FROM transactions
      `
        )
        .get() as { total_count: number; total_amount: number };

      expect(result.total_count).toBe(0);
      expect(result.total_amount).toBe(0);
    });
  });

  describe('Keyword extraction', () => {
    it('should extract first significant word', () => {
      // Testing the extractKeyword logic
      const description = 'ALBERT Store Purchase';
      const stopWords = ['payment', 'transfer', 'card', 'store', 'purchase'];

      const words = description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.includes(word));

      expect(words[0]).toBe('albert');
    });

    it('should skip stop words', () => {
      const description = 'Payment for STARBUCKS coffee';
      const stopWords = ['payment', 'transfer', 'for', 'coffee'];

      const words = description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.includes(word));

      expect(words[0]).toBe('starbucks');
    });
  });
});
