import { getDatabase } from '../db/database';
import type { ParsedTransaction, CategoryRule } from 'shared/types';

/**
 * CategorizationService - Handles keyword-based transaction categorization
 *
 * Responsibilities:
 * - Categorize individual transactions against existing rules
 * - Batch categorize multiple transactions efficiently
 * - Learn new rules from transaction descriptions
 * - Extract significant keywords from descriptions
 */
export class CategorizationService {
  /**
   * List of common words to skip during keyword extraction.
   * These words are too generic to be useful for categorization.
   */
  private readonly stopWords = new Set([
    // Transaction-related
    'payment',
    'transfer',
    'card',
    'debit',
    'credit',
    'pos',
    'atm',
    'fee',
    'charge',
    'transaction',
    'purchase',
    'withdrawal',
    'deposit',
    'balance',
    'account',
    'ref',
    'reference',
    'number',
    'date',
    // Common prepositions and articles
    'from',
    'to',
    'the',
    'a',
    'an',
    'and',
    'or',
    'for',
    'of',
    'in',
    'on',
    'at',
    'with',
    'by',
    'as',
    'is',
    'was',
    'be',
    'been',
    'being',
    // Common abbreviations
    'cz',
    'czk',
    'eur',
    'usd',
    'gbp',
    's.r.o',
    'sro',
    'a.s',
    'as',
    'spol',
    // Generic words
    'international',
    'service',
    'services',
    'company',
    'group',
    'inc',
    'ltd',
    'llc',
    'corp',
  ]);

  /**
   * Categorize a single transaction using existing rules
   *
   * @param transaction - Transaction to categorize (needs description and bank fields)
   * @returns category_id if a matching rule is found, null otherwise
   */
  categorize(transaction: Pick<ParsedTransaction, 'description'>): number | null {
    const db = getDatabase();
    const rules = db.prepare('SELECT keyword, category_id FROM category_rules').all() as CategoryRule[];

    return this.findMatchingCategory(transaction.description, rules);
  }

  /**
   * Batch categorize multiple transactions efficiently
   * Loads rules once and applies to all transactions
   *
   * @param transactions - Array of transactions to categorize
   * @returns Map of transaction index to category_id (only includes matched transactions)
   */
  categorizeAll(
    transactions: Pick<ParsedTransaction, 'description'>[]
  ): Map<number, number> {
    const db = getDatabase();
    const rules = db.prepare('SELECT keyword, category_id FROM category_rules').all() as CategoryRule[];

    const results = new Map<number, number>();

    for (let i = 0; i < transactions.length; i++) {
      const categoryId = this.findMatchingCategory(transactions[i].description, rules);
      if (categoryId !== null) {
        results.set(i, categoryId);
      }
    }

    return results;
  }

  /**
   * Learn a new categorization rule from a transaction description
   * Extracts a keyword and creates a rule if it doesn't already exist
   *
   * @param description - Transaction description to extract keyword from
   * @param categoryId - Category ID to associate with the keyword
   * @returns Object with success status, created keyword, or null if rule already exists/no keyword extracted
   */
  learnRule(
    description: string,
    categoryId: number
  ): { success: boolean; keyword: string | null; ruleId: number | null; alreadyExists: boolean } {
    const db = getDatabase();

    // Verify category exists
    const categoryExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!categoryExists) {
      return { success: false, keyword: null, ruleId: null, alreadyExists: false };
    }

    // Extract keyword from description
    const keyword = this.extractKeyword(description);
    if (!keyword) {
      return { success: false, keyword: null, ruleId: null, alreadyExists: false };
    }

    // Check if rule already exists (case-insensitive)
    const existingRule = db
      .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
      .get(keyword) as { id: number } | undefined;

    if (existingRule) {
      return { success: false, keyword, ruleId: existingRule.id, alreadyExists: true };
    }

    // Create new rule
    const result = db
      .prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)')
      .run(keyword.toLowerCase(), categoryId);

    return {
      success: true,
      keyword,
      ruleId: Number(result.lastInsertRowid),
      alreadyExists: false,
    };
  }

  /**
   * Extract a significant keyword from a transaction description
   * Skips common/stop words and returns the first meaningful word
   *
   * @param description - Transaction description to extract keyword from
   * @returns Extracted keyword (lowercase) or null if no suitable keyword found
   */
  extractKeyword(description: string): string | null {
    // Clean description: remove special characters, convert to lowercase
    const cleanedDescription = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words
    const words = cleanedDescription.split(' ');

    // Find first significant word
    for (const word of words) {
      // Skip words that are too short (less than 3 characters)
      if (word.length < 3) {
        continue;
      }

      // Skip stop words
      if (this.stopWords.has(word)) {
        continue;
      }

      // Skip pure numbers
      if (/^\d+$/.test(word)) {
        continue;
      }

      // Return first valid keyword
      return word;
    }

    return null;
  }

  /**
   * Apply categorization rules to a description
   * Uses case-insensitive substring matching
   *
   * @param description - Transaction description to match against rules
   * @param rules - Array of categorization rules
   * @returns category_id if a match is found, null otherwise
   */
  findMatchingCategory(
    description: string,
    rules: Pick<CategoryRule, 'keyword' | 'category_id'>[]
  ): number | null {
    const descriptionLower = description.toLowerCase();

    for (const rule of rules) {
      if (descriptionLower.includes(rule.keyword.toLowerCase())) {
        return rule.category_id;
      }
    }

    return null;
  }

  /**
   * Categorize a transaction using provided rules (for batch operations)
   * This is useful when you want to reuse a pre-loaded rules array
   *
   * @param transaction - Transaction to categorize
   * @param rules - Pre-loaded categorization rules
   * @returns category_id if a match is found, null otherwise
   */
  categorizeWithRules(
    transaction: Pick<ParsedTransaction, 'description'>,
    rules: Pick<CategoryRule, 'keyword' | 'category_id'>[]
  ): number | null {
    return this.findMatchingCategory(transaction.description, rules);
  }
}

// Export a singleton instance
export const categorizationService = new CategorizationService();
