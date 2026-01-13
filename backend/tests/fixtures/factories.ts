/**
 * Test Data Factories
 *
 * Factory functions for creating test data with sensible defaults.
 * Each factory returns plain objects that can be inserted into the database.
 */

import type { BankName } from '../../../shared/types';

// Type definitions for factory outputs (without auto-generated fields)
export interface TransactionInput {
  date: string;
  amount: number;
  description: string;
  bank: BankName;
  category_id: number | null;
}

export interface CategoryInput {
  name: string;
  color: string;
}

export interface RuleInput {
  keyword: string;
  category_id: number;
}

export interface UploadLogInput {
  filename: string;
  bank: BankName;
  transaction_count: number;
}

// Counter for generating unique values
let transactionCounter = 0;
let categoryCounter = 0;
let ruleCounter = 0;

/**
 * Reset all counters (call in beforeEach if needed for deterministic IDs)
 */
export function resetFactoryCounters(): void {
  transactionCounter = 0;
  categoryCounter = 0;
  ruleCounter = 0;
}

/**
 * Create a transaction object with default values
 */
export function createTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  transactionCounter++;
  return {
    date: `2024-01-${String(transactionCounter).padStart(2, '0')}`,
    amount: -50.0,
    description: `Test Transaction ${transactionCounter}`,
    bank: 'CSOB',
    category_id: null,
    ...overrides,
  };
}

/**
 * Create multiple transactions with optional overrides
 */
export function createTransactions(
  count: number,
  overrides: Partial<TransactionInput> | ((index: number) => Partial<TransactionInput>) = {}
): TransactionInput[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createTransaction(itemOverrides);
  });
}

/**
 * Create a category object with default values
 */
export function createCategory(overrides: Partial<CategoryInput> = {}): CategoryInput {
  categoryCounter++;
  return {
    name: `Test Category ${categoryCounter}`,
    color: `#${String(categoryCounter * 111111).padStart(6, '0').slice(0, 6)}`,
    ...overrides,
  };
}

/**
 * Create multiple categories with optional overrides
 */
export function createCategories(
  count: number,
  overrides: Partial<CategoryInput> | ((index: number) => Partial<CategoryInput>) = {}
): CategoryInput[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createCategory(itemOverrides);
  });
}

/**
 * Create a rule object with default values
 */
export function createRule(overrides: Partial<RuleInput> & { category_id: number }): RuleInput {
  ruleCounter++;
  return {
    keyword: `keyword${ruleCounter}`,
    ...overrides,
  };
}

/**
 * Create multiple rules with optional overrides
 */
export function createRules(
  count: number,
  overrides: (Partial<RuleInput> & { category_id: number }) | ((index: number) => Partial<RuleInput> & { category_id: number })
): RuleInput[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createRule(itemOverrides);
  });
}

/**
 * Create an upload log object with default values
 */
export function createUploadLog(overrides: Partial<UploadLogInput> = {}): UploadLogInput {
  return {
    filename: 'test-upload.csv',
    bank: 'CSOB',
    transaction_count: 10,
    ...overrides,
  };
}

// Common test data presets

/**
 * Preset: Grocery store transaction
 */
export function groceryTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'ALBERT Store Purchase',
    amount: -75.50,
    bank: 'CSOB',
    ...overrides,
  });
}

/**
 * Preset: Transport/fuel transaction
 */
export function transportTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'SHELL Gas Station',
    amount: -45.00,
    bank: 'Raiffeisen',
    ...overrides,
  });
}

/**
 * Preset: Online shopping transaction
 */
export function shoppingTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'AMAZON Purchase',
    amount: -120.00,
    bank: 'Revolut',
    ...overrides,
  });
}

/**
 * Preset: Subscription transaction
 */
export function subscriptionTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'NETFLIX Subscription',
    amount: -15.99,
    bank: 'Revolut',
    ...overrides,
  });
}

/**
 * Preset: Income transaction (positive amount)
 */
export function incomeTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'SALARY Payment',
    amount: 5000.00,
    bank: 'CSOB',
    ...overrides,
  });
}

/**
 * Preset: Restaurant transaction
 */
export function restaurantTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return createTransaction({
    description: 'STARBUCKS Coffee',
    amount: -8.50,
    bank: 'Revolut',
    ...overrides,
  });
}
