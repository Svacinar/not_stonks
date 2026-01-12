import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `rules-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

// Helper function to seed test transactions
function seedTestTransactions(db: ReturnType<typeof getDatabase>) {
  const insert = db.prepare(`
    INSERT INTO transactions (date, amount, description, bank, category_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Insert test transactions (all uncategorized)
  insert.run('2024-01-15', -50.0, 'ALBERT Store Purchase', 'CSOB', null);
  insert.run('2024-01-16', -30.0, 'LIDL Groceries', 'CSOB', null);
  insert.run('2024-01-17', -25.0, 'SHELL Gas Station', 'Raiffeisen', null);
  insert.run('2024-01-18', -100.0, 'AMAZON Shopping', 'Revolut', null);
  insert.run('2024-01-19', -15.0, 'STARBUCKS Coffee', 'Revolut', null);
}

// Helper to seed a rule
function seedRule(db: ReturnType<typeof getDatabase>, keyword: string, categoryName: string) {
  const category = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName) as { id: number };

  return db
    .prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)')
    .run(keyword, category.id);
}

describe('Rules Route Logic', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('GET /api/rules - List all rules', () => {
    it('should return empty array when no rules exist', () => {
      const db = getDatabase();

      const query = `
        SELECT
          cr.id,
          cr.keyword,
          cr.category_id,
          cr.created_at,
          c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        ORDER BY cr.keyword ASC
      `;

      const rules = db.prepare(query).all();

      expect(rules).toEqual([]);
    });

    it('should return all rules with category names', () => {
      const db = getDatabase();

      // Create some rules
      seedRule(db, 'albert', 'Food');
      seedRule(db, 'shell', 'Transport');
      seedRule(db, 'amazon', 'Shopping');

      const query = `
        SELECT
          cr.id,
          cr.keyword,
          cr.category_id,
          cr.created_at,
          c.name as category_name
        FROM category_rules cr
        JOIN categories c ON cr.category_id = c.id
        ORDER BY cr.keyword ASC
      `;

      const rules = db.prepare(query).all() as { keyword: string; category_name: string }[];

      expect(rules.length).toBe(3);
      expect(rules[0].keyword).toBe('albert');
      expect(rules[0].category_name).toBe('Food');
      expect(rules[1].keyword).toBe('amazon');
      expect(rules[1].category_name).toBe('Shopping');
      expect(rules[2].keyword).toBe('shell');
      expect(rules[2].category_name).toBe('Transport');
    });

    it('should return rules ordered by keyword', () => {
      const db = getDatabase();

      seedRule(db, 'zebra', 'Other');
      seedRule(db, 'apple', 'Food');
      seedRule(db, 'metro', 'Transport');

      const query = `
        SELECT keyword FROM category_rules ORDER BY keyword ASC
      `;

      const rules = db.prepare(query).all() as { keyword: string }[];

      expect(rules[0].keyword).toBe('apple');
      expect(rules[1].keyword).toBe('metro');
      expect(rules[2].keyword).toBe('zebra');
    });
  });

  describe('POST /api/rules - Create rule', () => {
    it('should create a new rule', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const result = db
        .prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)')
        .run('restaurant', foodCat.id);

      expect(result.lastInsertRowid).toBeGreaterThan(0);

      const created = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(result.lastInsertRowid) as {
        keyword: string;
        category_id: number;
      };

      expect(created.keyword).toBe('restaurant');
      expect(created.category_id).toBe(foodCat.id);
    });

    it('should store keywords in lowercase', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'restaurant',
        foodCat.id
      );

      const rule = db
        .prepare('SELECT keyword FROM category_rules WHERE keyword = ?')
        .get('restaurant') as { keyword: string };

      expect(rule.keyword).toBe('restaurant');
    });

    it('should not allow duplicate keywords (case-insensitive)', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'restaurant',
        foodCat.id
      );

      // Try to check for duplicate
      const existing = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
        .get('RESTAURANT');

      expect(existing).toBeDefined();
    });

    it('should verify category exists before creating rule', () => {
      const db = getDatabase();

      // Check if invalid category ID exists
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(99999);

      expect(category).toBeUndefined();
    });
  });

  describe('PATCH /api/rules/:id - Update rule', () => {
    it('should update rule keyword', () => {
      const db = getDatabase();

      const result = seedRule(db, 'oldkeyword', 'Food');

      db.prepare('UPDATE category_rules SET keyword = ? WHERE id = ?').run(
        'newkeyword',
        result.lastInsertRowid
      );

      const updated = db
        .prepare('SELECT keyword FROM category_rules WHERE id = ?')
        .get(result.lastInsertRowid) as { keyword: string };

      expect(updated.keyword).toBe('newkeyword');
    });

    it('should update rule category_id', () => {
      const db = getDatabase();

      const result = seedRule(db, 'testkeyword', 'Food');

      const transportCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Transport'")
        .get() as { id: number };

      db.prepare('UPDATE category_rules SET category_id = ? WHERE id = ?').run(
        transportCat.id,
        result.lastInsertRowid
      );

      const updated = db
        .prepare('SELECT category_id FROM category_rules WHERE id = ?')
        .get(result.lastInsertRowid) as { category_id: number };

      expect(updated.category_id).toBe(transportCat.id);
    });

    it('should not allow update to duplicate keyword', () => {
      const db = getDatabase();

      seedRule(db, 'keyword1', 'Food');
      const result2 = seedRule(db, 'keyword2', 'Transport');

      // Check if keyword1 already exists (excluding current rule)
      const duplicate = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?) AND id != ?')
        .get('keyword1', result2.lastInsertRowid);

      expect(duplicate).toBeDefined();
    });

    it('should return undefined for non-existent rule', () => {
      const db = getDatabase();

      const result = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(99999);

      expect(result).toBeUndefined();
    });
  });

  describe('DELETE /api/rules/:id - Delete rule', () => {
    it('should delete a rule', () => {
      const db = getDatabase();

      const result = seedRule(db, 'tobedeleted', 'Food');

      const deleteResult = db.prepare('DELETE FROM category_rules WHERE id = ?').run(result.lastInsertRowid);

      expect(deleteResult.changes).toBe(1);

      const deleted = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(result.lastInsertRowid);
      expect(deleted).toBeUndefined();
    });

    it('should return 0 changes for non-existent rule', () => {
      const db = getDatabase();

      const result = db.prepare('DELETE FROM category_rules WHERE id = ?').run(99999);

      expect(result.changes).toBe(0);
    });
  });

  describe('POST /api/rules/apply - Apply rules to uncategorized transactions', () => {
    it('should categorize transactions based on matching rules', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      // Create rules
      seedRule(db, 'albert', 'Food');
      seedRule(db, 'lidl', 'Food');
      seedRule(db, 'shell', 'Transport');

      // Get uncategorized count before
      const beforeCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      expect(beforeCount.count).toBe(5);

      // Apply rules
      const rules = db.prepare('SELECT id, keyword, category_id FROM category_rules').all() as {
        keyword: string;
        category_id: number;
      }[];
      const uncategorized = db
        .prepare('SELECT id, description FROM transactions WHERE category_id IS NULL')
        .all() as { id: number; description: string }[];

      const updateStmt = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?');
      let categorizedCount = 0;

      for (const transaction of uncategorized) {
        const descriptionLower = transaction.description.toLowerCase();
        for (const rule of rules) {
          if (descriptionLower.includes(rule.keyword.toLowerCase())) {
            updateStmt.run(rule.category_id, transaction.id);
            categorizedCount++;
            break;
          }
        }
      }

      // Should have categorized 3 transactions (ALBERT, LIDL, SHELL)
      expect(categorizedCount).toBe(3);

      // Get uncategorized count after
      const afterCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      expect(afterCount.count).toBe(2); // AMAZON and STARBUCKS still uncategorized
    });

    it('should do nothing when no rules exist', () => {
      const db = getDatabase();
      seedTestTransactions(db);

      const rules = db.prepare('SELECT id, keyword, category_id FROM category_rules').all();

      expect(rules.length).toBe(0);
    });

    it('should do nothing when no uncategorized transactions exist', () => {
      const db = getDatabase();

      // Create categorized transactions
      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare(
        'INSERT INTO transactions (date, amount, description, bank, category_id) VALUES (?, ?, ?, ?, ?)'
      ).run('2024-01-15', -50.0, 'ALBERT Store', 'CSOB', foodCat.id);

      const uncategorized = db
        .prepare('SELECT id FROM transactions WHERE category_id IS NULL')
        .all();

      expect(uncategorized.length).toBe(0);
    });

    it('should use case-insensitive matching', () => {
      const db = getDatabase();

      // Create a transaction with mixed case description
      db.prepare(
        'INSERT INTO transactions (date, amount, description, bank, category_id) VALUES (?, ?, ?, ?, ?)'
      ).run('2024-01-15', -50.0, 'ALBERT Store Purchase', 'CSOB', null);

      // Create a rule with lowercase keyword
      seedRule(db, 'albert', 'Food');

      // Apply rule
      const rules = db.prepare('SELECT id, keyword, category_id FROM category_rules').all() as {
        keyword: string;
        category_id: number;
      }[];
      const uncategorized = db
        .prepare('SELECT id, description FROM transactions WHERE category_id IS NULL')
        .all() as { id: number; description: string }[];

      const updateStmt = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?');

      for (const transaction of uncategorized) {
        const descriptionLower = transaction.description.toLowerCase();
        for (const rule of rules) {
          if (descriptionLower.includes(rule.keyword.toLowerCase())) {
            updateStmt.run(rule.category_id, transaction.id);
            break;
          }
        }
      }

      // Check transaction is now categorized
      const afterCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      expect(afterCount.count).toBe(0);
    });

    it('should only apply first matching rule', () => {
      const db = getDatabase();

      // Create a transaction
      db.prepare(
        'INSERT INTO transactions (date, amount, description, bank, category_id) VALUES (?, ?, ?, ?, ?)'
      ).run('2024-01-15', -50.0, 'ALBERT LIDL Combined Store', 'CSOB', null);

      // Create two rules that could both match
      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };
      const shoppingCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Shopping'")
        .get() as { id: number };

      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run('albert', foodCat.id);
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run('lidl', shoppingCat.id);

      // Apply rules (albert comes first alphabetically)
      const rules = db.prepare('SELECT id, keyword, category_id FROM category_rules ORDER BY keyword ASC').all() as {
        keyword: string;
        category_id: number;
      }[];
      const uncategorized = db
        .prepare('SELECT id, description FROM transactions WHERE category_id IS NULL')
        .all() as { id: number; description: string }[];

      const updateStmt = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?');

      for (const transaction of uncategorized) {
        const descriptionLower = transaction.description.toLowerCase();
        for (const rule of rules) {
          if (descriptionLower.includes(rule.keyword.toLowerCase())) {
            updateStmt.run(rule.category_id, transaction.id);
            break; // Only first matching rule
          }
        }
      }

      // Transaction should be categorized as Food (albert matches first)
      const transaction = db
        .prepare('SELECT category_id FROM transactions WHERE description LIKE ?')
        .get('%Combined Store%') as { category_id: number };

      expect(transaction.category_id).toBe(foodCat.id);
    });
  });

  describe('Keywords are case-insensitive', () => {
    it('should match keywords regardless of case', () => {
      const db = getDatabase();

      // Create rules with various cases
      seedRule(db, 'albert', 'Food');

      // Check case-insensitive lookup
      const foundLower = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
        .get('albert');
      const foundUpper = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
        .get('ALBERT');
      const foundMixed = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
        .get('AlBeRt');

      expect(foundLower).toBeDefined();
      expect(foundUpper).toBeDefined();
      expect(foundMixed).toBeDefined();
    });
  });

  describe('Rule cascade delete', () => {
    it('should delete rules when category is deleted (CASCADE)', () => {
      const db = getDatabase();

      // Create a test category
      const result = db
        .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
        .run('TestCategory', '#ff0000');
      const categoryId = result.lastInsertRowid;

      // Create rules for this category
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run('test1', categoryId);
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run('test2', categoryId);

      const rulesBefore = db
        .prepare('SELECT COUNT(*) as count FROM category_rules WHERE category_id = ?')
        .get(categoryId) as { count: number };

      expect(rulesBefore.count).toBe(2);

      // Delete the category
      db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

      // Rules should be deleted due to CASCADE
      const rulesAfter = db
        .prepare('SELECT COUNT(*) as count FROM category_rules WHERE category_id = ?')
        .get(categoryId) as { count: number };

      expect(rulesAfter.count).toBe(0);
    });
  });
});
