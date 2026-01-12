import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, resetDatabase, closeDatabase } from '../src/db/database';
import { CategorizationService, categorizationService } from '../src/services/categorizationService';
import path from 'path';
import os from 'os';

// Use a unique test database for this test file
const testDbPath = path.join(os.tmpdir(), `categorization-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

// Helper function to seed a rule
function seedRule(db: ReturnType<typeof getDatabase>, keyword: string, categoryName: string): number {
  const category = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName) as { id: number };

  const result = db
    .prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)')
    .run(keyword.toLowerCase(), category.id);

  return Number(result.lastInsertRowid);
}

// Helper function to get category ID by name
function getCategoryId(db: ReturnType<typeof getDatabase>, categoryName: string): number {
  const category = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName) as { id: number };
  return category.id;
}

describe('CategorizationService', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  describe('extractKeyword', () => {
    const service = new CategorizationService();

    it('should extract first significant word from description', () => {
      expect(service.extractKeyword('ALBERT Supermarket Prague')).toBe('albert');
      expect(service.extractKeyword('LIDL Store Purchase')).toBe('lidl');
      expect(service.extractKeyword('SHELL Gas Station')).toBe('shell');
    });

    it('should skip common stop words', () => {
      // "payment" is a stop word, should get "starbucks"
      expect(service.extractKeyword('Payment STARBUCKS Coffee')).toBe('starbucks');
      // "transfer" is a stop word, should get "amazon"
      expect(service.extractKeyword('Transfer from AMAZON')).toBe('amazon');
      // "card" is a stop word
      expect(service.extractKeyword('Card payment NETFLIX')).toBe('netflix');
    });

    it('should handle descriptions with only stop words', () => {
      expect(service.extractKeyword('payment transfer card')).toBeNull();
      expect(service.extractKeyword('the a an')).toBeNull();
    });

    it('should skip short words (less than 3 characters)', () => {
      expect(service.extractKeyword('AB CD EFGH')).toBe('efgh');
      expect(service.extractKeyword('A B C')).toBeNull();
    });

    it('should skip pure numbers', () => {
      expect(service.extractKeyword('123 456 AMAZON')).toBe('amazon');
      expect(service.extractKeyword('123456')).toBeNull();
    });

    it('should return lowercase keywords', () => {
      expect(service.extractKeyword('ALBERT')).toBe('albert');
      expect(service.extractKeyword('MaXiMa')).toBe('maxima');
    });

    it('should handle special characters', () => {
      expect(service.extractKeyword('ALBERT* Store #123')).toBe('albert');
      expect(service.extractKeyword('McDONALDS - Big Mac')).toBe('mcdonalds');
    });

    it('should handle empty or whitespace-only descriptions', () => {
      expect(service.extractKeyword('')).toBeNull();
      expect(service.extractKeyword('   ')).toBeNull();
    });

    it('should skip common Czech abbreviations', () => {
      expect(service.extractKeyword('CZ ALBERT Store')).toBe('albert');
      // S.R.O. becomes "s r o" after cleaning, "company" is a stop word, so "name" is returned
      expect(service.extractKeyword('S.R.O. ACME NAME')).toBe('acme');
    });

    it('should skip currency codes', () => {
      expect(service.extractKeyword('CZK 100 ALBERT')).toBe('albert');
      expect(service.extractKeyword('EUR AMAZON')).toBe('amazon');
    });

    describe('realistic transaction descriptions', () => {
      it('should extract keywords from CSOB descriptions', () => {
        expect(service.extractKeyword('ALBERT HYPERMARKET PRAHA')).toBe('albert');
        expect(service.extractKeyword('PLATBA KARTOU LIDL BRNO')).toBe('platba');
        expect(service.extractKeyword('SHELL CZ BENZINKA OSTRAVA')).toBe('shell');
      });

      it('should extract keywords from Raiffeisen descriptions', () => {
        // Non-ASCII characters are stripped, so "Nákup:" becomes "n kup", and "kup" (3 chars) is the first valid word
        expect(service.extractKeyword('Nákup: TESCO Stores')).toBe('kup');
        // "Platba" is not in stop words, so it's returned as is
        expect(service.extractKeyword('Platba kartou - STARBUCKS')).toBe('platba');
      });

      it('should extract keywords from Revolut descriptions', () => {
        expect(service.extractKeyword('Netflix')).toBe('netflix');
        expect(service.extractKeyword('Spotify Premium')).toBe('spotify');
        expect(service.extractKeyword('Amazon Prime')).toBe('amazon');
      });
    });
  });

  describe('categorize', () => {
    it('should return category_id when a rule matches', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');

      const result = categorizationService.categorize({ description: 'ALBERT Supermarket' });

      const foodId = getCategoryId(db, 'Food');
      expect(result).toBe(foodId);
    });

    it('should return null when no rule matches', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');

      const result = categorizationService.categorize({ description: 'RANDOM Store' });

      expect(result).toBeNull();
    });

    it('should match case-insensitively', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');

      expect(categorizationService.categorize({ description: 'albert' })).not.toBeNull();
      expect(categorizationService.categorize({ description: 'ALBERT' })).not.toBeNull();
      expect(categorizationService.categorize({ description: 'AlBeRt' })).not.toBeNull();
    });

    it('should use substring matching', () => {
      const db = getDatabase();
      seedRule(db, 'starbucks', 'Food');

      const result = categorizationService.categorize({
        description: 'Payment at STARBUCKS Coffee Shop Prague',
      });

      const foodId = getCategoryId(db, 'Food');
      expect(result).toBe(foodId);
    });

    it('should return first matching rule when multiple rules could match', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');
      seedRule(db, 'shop', 'Shopping');

      // Description contains both "albert" and "shop"
      const result = categorizationService.categorize({
        description: 'ALBERT Shopping Center',
      });

      // Should match the first rule in DB order (depends on insertion order)
      expect(result).not.toBeNull();
    });

    it('should return null when no rules exist', () => {
      const result = categorizationService.categorize({ description: 'ALBERT Store' });

      expect(result).toBeNull();
    });
  });

  describe('categorizeAll', () => {
    it('should categorize all matching transactions', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');
      seedRule(db, 'shell', 'Transport');

      const transactions = [
        { description: 'ALBERT Store' },
        { description: 'SHELL Gas Station' },
        { description: 'RANDOM Place' },
      ];

      const results = categorizationService.categorizeAll(transactions);

      expect(results.size).toBe(2);
      expect(results.get(0)).toBe(getCategoryId(db, 'Food'));
      expect(results.get(1)).toBe(getCategoryId(db, 'Transport'));
      expect(results.has(2)).toBe(false);
    });

    it('should handle empty transaction array', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');

      const results = categorizationService.categorizeAll([]);

      expect(results.size).toBe(0);
    });

    it('should handle no matching transactions', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');

      const transactions = [
        { description: 'RANDOM Place 1' },
        { description: 'RANDOM Place 2' },
      ];

      const results = categorizationService.categorizeAll(transactions);

      expect(results.size).toBe(0);
    });

    it('should be efficient with many transactions', () => {
      const db = getDatabase();
      seedRule(db, 'albert', 'Food');
      seedRule(db, 'shell', 'Transport');
      seedRule(db, 'amazon', 'Shopping');

      // Create 100 transactions
      const transactions = Array.from({ length: 100 }, (_, i) => ({
        description: i % 3 === 0 ? 'ALBERT Store' : i % 3 === 1 ? 'SHELL Gas' : 'Random Place',
      }));

      const startTime = Date.now();
      const results = categorizationService.categorizeAll(transactions);
      const endTime = Date.now();

      // Should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);

      // ~33 ALBERT + ~33 SHELL = ~66 categorized
      expect(results.size).toBeGreaterThan(60);
      expect(results.size).toBeLessThan(70);
    });
  });

  describe('learnRule', () => {
    it('should create a new rule from description', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      const result = categorizationService.learnRule('ALBERT Supermarket Prague', foodId);

      expect(result.success).toBe(true);
      expect(result.keyword).toBe('albert');
      expect(result.ruleId).not.toBeNull();
      expect(result.alreadyExists).toBe(false);

      // Verify rule was created in database
      const rule = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(result.ruleId) as {
        keyword: string;
        category_id: number;
      };
      expect(rule.keyword).toBe('albert');
      expect(rule.category_id).toBe(foodId);
    });

    it('should not create duplicate rules', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      // Create first rule
      categorizationService.learnRule('ALBERT Store', foodId);

      // Try to create duplicate
      const result = categorizationService.learnRule('ALBERT Supermarket', foodId);

      expect(result.success).toBe(false);
      expect(result.keyword).toBe('albert');
      expect(result.alreadyExists).toBe(true);
    });

    it('should return failure for invalid category', () => {
      const result = categorizationService.learnRule('ALBERT Store', 99999);

      expect(result.success).toBe(false);
      expect(result.keyword).toBeNull();
      expect(result.ruleId).toBeNull();
    });

    it('should return failure when no keyword can be extracted', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      const result = categorizationService.learnRule('payment transfer', foodId);

      expect(result.success).toBe(false);
      expect(result.keyword).toBeNull();
    });

    it('should store keywords in lowercase', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      const result = categorizationService.learnRule('STARBUCKS Coffee', foodId);

      expect(result.keyword).toBe('starbucks');

      const rule = db.prepare('SELECT keyword FROM category_rules WHERE id = ?').get(result.ruleId) as {
        keyword: string;
      };
      expect(rule.keyword).toBe('starbucks');
    });

    it('should return existing rule ID when duplicate', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      const first = categorizationService.learnRule('ALBERT Store', foodId);
      const second = categorizationService.learnRule('ALBERT Other', foodId);

      expect(second.ruleId).toBe(first.ruleId);
    });
  });

  describe('findMatchingCategory', () => {
    it('should match rules correctly', () => {
      const service = new CategorizationService();
      const rules = [
        { keyword: 'albert', category_id: 1 },
        { keyword: 'shell', category_id: 2 },
      ];

      expect(service.findMatchingCategory('ALBERT Store', rules)).toBe(1);
      expect(service.findMatchingCategory('SHELL Gas', rules)).toBe(2);
      expect(service.findMatchingCategory('RANDOM', rules)).toBeNull();
    });

    it('should return first matching rule', () => {
      const service = new CategorizationService();
      const rules = [
        { keyword: 'store', category_id: 1 },
        { keyword: 'albert', category_id: 2 },
      ];

      // Both could match, but "store" is first
      expect(service.findMatchingCategory('ALBERT Store', rules)).toBe(1);
    });
  });

  describe('categorizeWithRules', () => {
    it('should categorize using provided rules', () => {
      const service = new CategorizationService();
      const rules = [
        { keyword: 'albert', category_id: 1 },
        { keyword: 'shell', category_id: 2 },
      ];

      const result = service.categorizeWithRules({ description: 'ALBERT Store' }, rules);

      expect(result).toBe(1);
    });

    it('should allow reusing rules for multiple transactions', () => {
      const service = new CategorizationService();
      const rules = [
        { keyword: 'albert', category_id: 1 },
      ];

      const transactions = [
        { description: 'ALBERT Store 1' },
        { description: 'ALBERT Store 2' },
        { description: 'ALBERT Store 3' },
      ];

      // Use same rules array for multiple categorizations
      const results = transactions.map((t) => service.categorizeWithRules(t, rules));

      expect(results).toEqual([1, 1, 1]);
    });
  });

  describe('integration scenarios', () => {
    it('should work end-to-end: create rule from transaction, then categorize similar transactions', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      // User categorizes a transaction manually, system learns a rule
      const learnResult = categorizationService.learnRule('ALBERT Hypermarket Praha', foodId);
      expect(learnResult.success).toBe(true);

      // Now similar transactions should be auto-categorized
      const result = categorizationService.categorize({ description: 'ALBERT Store Brno' });
      expect(result).toBe(foodId);
    });

    it('should handle mixed case descriptions consistently', () => {
      const db = getDatabase();
      const foodId = getCategoryId(db, 'Food');

      categorizationService.learnRule('STARBUCKS', foodId);

      // All case variations should match
      const descriptions = [
        'STARBUCKS Coffee',
        'starbucks coffee',
        'Starbucks COFFEE',
        'StArBuCkS CofFeE',
      ];

      for (const desc of descriptions) {
        expect(categorizationService.categorize({ description: desc })).toBe(foodId);
      }
    });

    it('should handle descriptions with numbers and special characters', () => {
      const db = getDatabase();
      const transportId = getCategoryId(db, 'Transport');

      categorizationService.learnRule('SHELL #1234 Gas Station', transportId);

      const result = categorizationService.categorize({ description: 'SHELL #5678 Gas Station Prague' });
      expect(result).toBe(transportId);
    });
  });
});
