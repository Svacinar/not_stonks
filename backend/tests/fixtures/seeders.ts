/**
 * Database Seeders
 *
 * Utility functions for seeding the test database with data.
 * These work directly with better-sqlite3 database instances.
 */

import type Database from 'better-sqlite3';
import type { TransactionInput, CategoryInput, RuleInput, UploadLogInput } from './factories';

// Types for database query results
interface CategoryRow {
  id: number;
  name: string;
  color: string;
}

interface TransactionRow {
  id: number;
  date: string;
  amount: number;
  description: string;
  bank: string;
  category_id: number | null;
  created_at: string;
}

interface RuleRow {
  id: number;
  keyword: string;
  category_id: number;
  created_at: string;
}

/**
 * Get a category by name from the database
 */
export function getCategoryByName(db: Database.Database, name: string): CategoryRow | undefined {
  return db.prepare('SELECT id, name, color FROM categories WHERE name = ?').get(name) as CategoryRow | undefined;
}

/**
 * Get a category ID by name (throws if not found)
 */
export function getCategoryId(db: Database.Database, name: string): number {
  const category = getCategoryByName(db, name);
  if (!category) {
    throw new Error(`Category "${name}" not found`);
  }
  return category.id;
}

/**
 * Get all default category IDs as a map
 */
export function getDefaultCategoryIds(db: Database.Database): Record<string, number> {
  const categories = db.prepare('SELECT id, name FROM categories').all() as { id: number; name: string }[];
  return categories.reduce((acc, cat) => {
    acc[cat.name] = cat.id;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Insert a single transaction into the database
 */
export function seedTransaction(db: Database.Database, transaction: TransactionInput): number {
  const stmt = db.prepare(`
    INSERT INTO transactions (date, amount, description, bank, category_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    transaction.date,
    transaction.amount,
    transaction.description,
    transaction.bank,
    transaction.category_id
  );
  return Number(result.lastInsertRowid);
}

/**
 * Insert multiple transactions into the database
 */
export function seedTransactions(db: Database.Database, transactions: TransactionInput[]): number[] {
  const stmt = db.prepare(`
    INSERT INTO transactions (date, amount, description, bank, category_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const ids: number[] = [];

  const insertMany = db.transaction((txns: TransactionInput[]) => {
    for (const transaction of txns) {
      const result = stmt.run(
        transaction.date,
        transaction.amount,
        transaction.description,
        transaction.bank,
        transaction.category_id
      );
      ids.push(Number(result.lastInsertRowid));
    }
  });

  insertMany(transactions);
  return ids;
}

/**
 * Insert a single category into the database
 */
export function seedCategory(db: Database.Database, category: CategoryInput): number {
  const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
  const result = stmt.run(category.name, category.color);
  return Number(result.lastInsertRowid);
}

/**
 * Insert multiple categories into the database
 */
export function seedCategories(db: Database.Database, categories: CategoryInput[]): number[] {
  const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
  const ids: number[] = [];

  const insertMany = db.transaction((cats: CategoryInput[]) => {
    for (const category of cats) {
      const result = stmt.run(category.name, category.color);
      ids.push(Number(result.lastInsertRowid));
    }
  });

  insertMany(categories);
  return ids;
}

/**
 * Insert a single rule into the database
 */
export function seedRule(db: Database.Database, rule: RuleInput): number {
  const stmt = db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)');
  const result = stmt.run(rule.keyword, rule.category_id);
  return Number(result.lastInsertRowid);
}

/**
 * Insert multiple rules into the database
 */
export function seedRules(db: Database.Database, rules: RuleInput[]): number[] {
  const stmt = db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)');
  const ids: number[] = [];

  const insertMany = db.transaction((rls: RuleInput[]) => {
    for (const rule of rls) {
      const result = stmt.run(rule.keyword, rule.category_id);
      ids.push(Number(result.lastInsertRowid));
    }
  });

  insertMany(rules);
  return ids;
}

/**
 * Insert an upload log entry into the database
 */
export function seedUploadLog(db: Database.Database, uploadLog: UploadLogInput): number {
  const stmt = db.prepare('INSERT INTO upload_log (filename, bank, transaction_count) VALUES (?, ?, ?)');
  const result = stmt.run(uploadLog.filename, uploadLog.bank, uploadLog.transaction_count);
  return Number(result.lastInsertRowid);
}

/**
 * Standard test data set - a realistic mix of transactions
 *
 * Creates 7 transactions across different banks, categories, and dates.
 * Matches the original seedTestTransactions pattern used throughout tests.
 */
export function seedStandardTestData(db: Database.Database): {
  transactionIds: number[];
  categories: Record<string, number>;
} {
  const categories = getDefaultCategoryIds(db);

  const transactions: TransactionInput[] = [
    {
      date: '2024-01-15',
      amount: -50.0,
      description: 'ALBERT Store Purchase',
      bank: 'CSOB',
      category_id: categories.Food,
    },
    {
      date: '2024-01-16',
      amount: -30.0,
      description: 'LIDL Groceries',
      bank: 'CSOB',
      category_id: categories.Food,
    },
    {
      date: '2024-01-17',
      amount: -25.0,
      description: 'SHELL Gas Station',
      bank: 'Raiffeisen',
      category_id: categories.Transport,
    },
    {
      date: '2024-01-18',
      amount: -100.0,
      description: 'AMAZON Purchase',
      bank: 'Revolut',
      category_id: null,
    },
    {
      date: '2024-02-01',
      amount: -75.0,
      description: 'NETFLIX Subscription',
      bank: 'Revolut',
      category_id: null,
    },
    {
      date: '2024-02-15',
      amount: -45.0,
      description: 'UBER Trip',
      bank: 'Revolut',
      category_id: categories.Transport,
    },
    {
      date: '2024-03-01',
      amount: -200.0,
      description: 'Unknown Transaction',
      bank: 'CSOB',
      category_id: null,
    },
  ];

  const transactionIds = seedTransactions(db, transactions);

  return { transactionIds, categories };
}

/**
 * Seed mixed transactions with both income and expenses (for stats/chart testing)
 * 
 * Creates transactions to test the Income vs Uncategorized distinction:
 * - Uncategorized income (positive amounts) should appear as "Income"
 * - Uncategorized expenses (negative amounts) should appear as "Uncategorized"
 */
export function seedMixedIncomeExpenseData(db: Database.Database): {
  transactionIds: number[];
  categories: Record<string, number>;
} {
  const categories = getDefaultCategoryIds(db);

  const transactions: TransactionInput[] = [
    // Categorized expenses
    {
      date: '2024-01-15',
      amount: -50.0,
      description: 'ALBERT Store Purchase',
      bank: 'CSOB',
      category_id: categories.Food,
    },
    {
      date: '2024-01-16',
      amount: -30.0,
      description: 'SHELL Gas Station',
      bank: 'Raiffeisen',
      category_id: categories.Transport,
    },
    // Uncategorized expenses (should appear as "Uncategorized")
    {
      date: '2024-01-17',
      amount: -100.0,
      description: 'AMAZON Purchase',
      bank: 'Revolut',
      category_id: null,
    },
    {
      date: '2024-01-18',
      amount: -75.0,
      description: 'Unknown Store',
      bank: 'CSOB',
      category_id: null,
    },
    // Uncategorized income (should appear as "Income")
    {
      date: '2024-01-20',
      amount: 5000.0,
      description: 'Salary Payment',
      bank: 'CSOB',
      category_id: null,
    },
    {
      date: '2024-01-25',
      amount: 1500.0,
      description: 'Freelance Payment',
      bank: 'Revolut',
      category_id: null,
    },
    // Categorized income (should keep its category)
    {
      date: '2024-01-28',
      amount: 200.0,
      description: 'Tax Refund',
      bank: 'CSOB',
      category_id: categories.Finance,
    },
  ];

  const transactionIds = seedTransactions(db, transactions);

  return { transactionIds, categories };
}

/**
 * Seed uncategorized transactions only (for rules testing)
 */
export function seedUncategorizedTransactions(db: Database.Database): number[] {
  const transactions: TransactionInput[] = [
    {
      date: '2024-01-15',
      amount: -50.0,
      description: 'ALBERT Store Purchase',
      bank: 'CSOB',
      category_id: null,
    },
    {
      date: '2024-01-16',
      amount: -30.0,
      description: 'LIDL Groceries',
      bank: 'CSOB',
      category_id: null,
    },
    {
      date: '2024-01-17',
      amount: -25.0,
      description: 'SHELL Gas Station',
      bank: 'Raiffeisen',
      category_id: null,
    },
    {
      date: '2024-01-18',
      amount: -100.0,
      description: 'AMAZON Shopping',
      bank: 'Revolut',
      category_id: null,
    },
    {
      date: '2024-01-19',
      amount: -15.0,
      description: 'STARBUCKS Coffee',
      bank: 'Revolut',
      category_id: null,
    },
  ];

  return seedTransactions(db, transactions);
}

/**
 * Seed rules with a given category name
 */
export function seedRuleForCategory(
  db: Database.Database,
  keyword: string,
  categoryName: string
): number {
  const categoryId = getCategoryId(db, categoryName);
  return seedRule(db, { keyword, category_id: categoryId });
}

// Query helpers

/**
 * Get transaction count
 */
export function getTransactionCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
  return result.count;
}

/**
 * Get uncategorized transaction count
 */
export function getUncategorizedCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL').get() as { count: number };
  return result.count;
}

/**
 * Get rule count
 */
export function getRuleCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM category_rules').get() as { count: number };
  return result.count;
}

/**
 * Get a transaction by ID
 */
export function getTransactionById(db: Database.Database, id: number): TransactionRow | undefined {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionRow | undefined;
}

/**
 * Get a rule by ID
 */
export function getRuleById(db: Database.Database, id: number): RuleRow | undefined {
  return db.prepare('SELECT * FROM category_rules WHERE id = ?').get(id) as RuleRow | undefined;
}
