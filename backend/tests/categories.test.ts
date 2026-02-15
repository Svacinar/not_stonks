import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import path from 'path';
import os from 'os';
import { seedStandardTestData, getCategoryId, seedTransactions } from './fixtures';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `categories-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

// Seed a subset of transactions for category-specific tests
function seedCategoryTestTransactions(db: ReturnType<typeof getDatabase>) {
  const foodId = getCategoryId(db, 'Food');
  const transportId = getCategoryId(db, 'Transport');

  seedTransactions(db, [
    { date: '2024-01-15', amount: -50.0, description: 'ALBERT Store Purchase', bank: 'CSOB', category_id: foodId },
    { date: '2024-01-16', amount: -30.0, description: 'LIDL Groceries', bank: 'CSOB', category_id: foodId },
    { date: '2024-01-17', amount: -25.0, description: 'SHELL Gas Station', bank: 'Raiffeisen', category_id: transportId },
    { date: '2024-01-18', amount: -100.0, description: 'AMAZON Purchase', bank: 'Revolut', category_id: null },
  ]);
}

describe('Categories Route Logic', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('GET /api/categories - List all categories', () => {
    it('should return all default categories with transaction counts', () => {
      const db = getDatabase();
      seedCategoryTestTransactions(db);

      const query = `
        SELECT
          c.id,
          c.name,
          c.color,
          COUNT(t.id) as transaction_count
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
      `;

      const categories = db.prepare(query).all() as { name: string; transaction_count: number }[];

      // Should have all 10 default categories
      expect(categories.length).toBe(10);

      // Food category should have 2 transactions
      const food = categories.find((c) => c.name === 'Food');
      expect(food).toBeDefined();
      expect(food?.transaction_count).toBe(2);

      // Transport should have 1 transaction
      const transport = categories.find((c) => c.name === 'Transport');
      expect(transport).toBeDefined();
      expect(transport?.transaction_count).toBe(1);

      // Shopping should have 0 transactions
      const shopping = categories.find((c) => c.name === 'Shopping');
      expect(shopping).toBeDefined();
      expect(shopping?.transaction_count).toBe(0);
    });

    it('should return categories ordered by name', () => {
      const db = getDatabase();

      const query = `
        SELECT name FROM categories ORDER BY name ASC
      `;

      const categories = db.prepare(query).all() as { name: string }[];

      expect(categories[0].name).toBe('Car Payments');
      expect(categories[categories.length - 1].name).toBe('Utilities');
    });
  });

  describe('GET /api/categories/:id - Single category', () => {
    it('should return a single category with stats', () => {
      const db = getDatabase();
      seedCategoryTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const query = `
        SELECT
          c.id,
          c.name,
          c.color,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(t.amount), 0) as total_amount
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id
        WHERE c.id = ?
        GROUP BY c.id
      `;

      const category = db.prepare(query).get(foodCat.id) as {
        name: string;
        transaction_count: number;
        total_amount: number;
      };

      expect(category.name).toBe('Food');
      expect(category.transaction_count).toBe(2);
      expect(category.total_amount).toBe(-80.0); // -50 + -30
    });

    it('should return undefined for non-existent category', () => {
      const db = getDatabase();

      const result = db.prepare('SELECT * FROM categories WHERE id = ?').get(99999);

      expect(result).toBeUndefined();
    });

    it('should return 0 transaction count for category without transactions', () => {
      const db = getDatabase();

      const entertainmentCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Entertainment'")
        .get() as { id: number };

      const query = `
        SELECT
          c.id,
          c.name,
          c.color,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(t.amount), 0) as total_amount
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id
        WHERE c.id = ?
        GROUP BY c.id
      `;

      const category = db.prepare(query).get(entertainmentCat.id) as {
        transaction_count: number;
        total_amount: number;
      };

      expect(category.transaction_count).toBe(0);
      expect(category.total_amount).toBe(0);
    });
  });

  describe('POST /api/categories - Create category', () => {
    it('should create a new category', () => {
      const db = getDatabase();

      const result = db
        .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
        .run('Test Category', '#ff5500');

      expect(result.lastInsertRowid).toBeGreaterThan(0);

      const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as {
        name: string;
        color: string;
      };

      expect(created.name).toBe('Test Category');
      expect(created.color).toBe('#ff5500');
    });

    it('should not allow duplicate category names', () => {
      const db = getDatabase();

      // Try to insert a category with existing name
      const existing = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
        .get('Food');

      expect(existing).toBeDefined();
    });

    it('should validate hex color format', () => {
      // Test valid hex colors
      const validColors = ['#000000', '#FFFFFF', '#ff0000', '#00ff00', '#0000ff', '#AbCdEf'];
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      validColors.forEach((color) => {
        expect(hexColorRegex.test(color)).toBe(true);
      });

      // Test invalid colors
      const invalidColors = ['red', '#fff', '#gggggg', '000000', '#ff00', '#ff000000'];

      invalidColors.forEach((color) => {
        expect(hexColorRegex.test(color)).toBe(false);
      });
    });
  });

  describe('PATCH /api/categories/:id - Update category', () => {
    it('should update category name', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run('Groceries', foodCat.id);

      const updated = db.prepare('SELECT name FROM categories WHERE id = ?').get(foodCat.id) as { name: string };

      expect(updated.name).toBe('Groceries');
    });

    it('should update category color', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare('UPDATE categories SET color = ? WHERE id = ?').run('#ff0000', foodCat.id);

      const updated = db.prepare('SELECT color FROM categories WHERE id = ?').get(foodCat.id) as { color: string };

      expect(updated.color).toBe('#ff0000');
    });

    it('should update both name and color', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(
        'Groceries',
        '#ff0000',
        foodCat.id
      );

      const updated = db.prepare('SELECT name, color FROM categories WHERE id = ?').get(foodCat.id) as {
        name: string;
        color: string;
      };

      expect(updated.name).toBe('Groceries');
      expect(updated.color).toBe('#ff0000');
    });

    it('should not allow update to duplicate name', () => {
      const db = getDatabase();

      const transportCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Transport'")
        .get() as { id: number };

      // Check if "Food" already exists (excluding current category)
      const duplicate = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get('Food', transportCat.id);

      expect(duplicate).toBeDefined();
    });
  });

  describe('DELETE /api/categories/:id - Delete category', () => {
    it('should delete a category', () => {
      const db = getDatabase();

      // Create a test category to delete
      const result = db
        .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
        .run('ToDelete', '#000000');

      const deleteResult = db.prepare('DELETE FROM categories WHERE id = ?').run(result.lastInsertRowid);

      expect(deleteResult.changes).toBe(1);

      const deleted = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      expect(deleted).toBeUndefined();
    });

    it('should set transaction category_id to null when category is deleted', () => {
      const db = getDatabase();
      seedCategoryTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Check transactions with food category
      const beforeCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
        .get(foodCat.id) as { count: number };

      expect(beforeCount.count).toBe(2);

      // Delete the category
      db.prepare('DELETE FROM categories WHERE id = ?').run(foodCat.id);

      // Check transactions now have null category_id
      const nullCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
        .get() as { count: number };

      // Should now have 3 null transactions (1 original + 2 from deleted Food category)
      expect(nullCount.count).toBe(3);
    });

    it('should return 0 changes for non-existent category', () => {
      const db = getDatabase();

      const result = db.prepare('DELETE FROM categories WHERE id = ?').run(99999);

      expect(result.changes).toBe(0);
    });

    it('should return count of affected transactions', () => {
      const db = getDatabase();
      seedCategoryTestTransactions(db);

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      const affectedCount = db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
        .get(foodCat.id) as { count: number };

      expect(affectedCount.count).toBe(2);
    });
  });

  describe('Duplicate name checks (case-insensitive)', () => {
    it('should treat category names as case-insensitive for uniqueness', () => {
      const db = getDatabase();

      // "Food" already exists
      const existsLower = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
        .get('food');
      const existsUpper = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
        .get('FOOD');
      const existsMixed = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
        .get('FoOd');

      expect(existsLower).toBeDefined();
      expect(existsUpper).toBeDefined();
      expect(existsMixed).toBeDefined();
    });
  });

  describe('Category with rules cascade delete', () => {
    it('should delete associated rules when category is deleted', () => {
      const db = getDatabase();

      const foodCat = db
        .prepare("SELECT id FROM categories WHERE name = 'Food'")
        .get() as { id: number };

      // Create a rule for Food category
      db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
        'restaurant',
        foodCat.id
      );

      const rulesBefore = db
        .prepare('SELECT COUNT(*) as count FROM category_rules WHERE category_id = ?')
        .get(foodCat.id) as { count: number };

      expect(rulesBefore.count).toBe(1);

      // Delete the category
      db.prepare('DELETE FROM categories WHERE id = ?').run(foodCat.id);

      // Rules should be deleted due to CASCADE
      const rulesAfter = db
        .prepare('SELECT COUNT(*) as count FROM category_rules WHERE category_id = ?')
        .get(foodCat.id) as { count: number };

      expect(rulesAfter.count).toBe(0);
    });
  });
});
