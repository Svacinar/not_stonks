/**
 * Frontend Mock Data Factories
 *
 * Factory functions for creating mock API response data.
 * These return objects matching the shape of API responses.
 */

// Types matching API responses
export interface MockTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  bank: 'CSOB' | 'Raiffeisen' | 'Revolut';
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  created_at?: string;
}

export interface MockCategory {
  id: number;
  name: string;
  color: string;
  transaction_count: number;
}

export interface MockRule {
  id: number;
  keyword: string;
  category_id: number;
  category_name: string;
  created_at: string;
}

export interface MockTransactionsResponse {
  transactions: MockTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface MockCategoriesResponse {
  categories: MockCategory[];
}

export interface MockRulesResponse {
  rules: MockRule[];
}

export interface MockUncategorizedResponse {
  transactions: MockTransaction[];
  total: number;
}

export interface MockApplyRulesResponse {
  success: boolean;
  categorized: number;
  total_uncategorized: number;
}

// Counters for unique IDs
let transactionIdCounter = 0;
let categoryIdCounter = 0;
let ruleIdCounter = 0;

/**
 * Reset all counters (call in beforeEach for deterministic IDs)
 */
export function resetMockCounters(): void {
  transactionIdCounter = 0;
  categoryIdCounter = 0;
  ruleIdCounter = 0;
}

/**
 * Create a mock transaction
 */
export function createMockTransaction(overrides: Partial<MockTransaction> = {}): MockTransaction {
  transactionIdCounter++;
  return {
    id: transactionIdCounter,
    date: '2024-06-15',
    description: `Transaction ${transactionIdCounter}`,
    amount: -100,
    bank: 'CSOB',
    category_id: null,
    category_name: null,
    category_color: null,
    ...overrides,
  };
}

/**
 * Create multiple mock transactions
 */
export function createMockTransactions(
  count: number,
  overrides: Partial<MockTransaction> | ((index: number) => Partial<MockTransaction>) = {}
): MockTransaction[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createMockTransaction(itemOverrides);
  });
}

/**
 * Create a mock category
 */
export function createMockCategory(overrides: Partial<MockCategory> = {}): MockCategory {
  categoryIdCounter++;
  return {
    id: categoryIdCounter,
    name: `Category ${categoryIdCounter}`,
    color: '#22c55e',
    transaction_count: 0,
    ...overrides,
  };
}

/**
 * Create multiple mock categories
 */
export function createMockCategories(
  count: number,
  overrides: Partial<MockCategory> | ((index: number) => Partial<MockCategory>) = {}
): MockCategory[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createMockCategory(itemOverrides);
  });
}

/**
 * Create a mock rule
 */
export function createMockRule(overrides: Partial<MockRule> = {}): MockRule {
  ruleIdCounter++;
  return {
    id: ruleIdCounter,
    keyword: `keyword${ruleIdCounter}`,
    category_id: 1,
    category_name: 'Default Category',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create multiple mock rules
 */
export function createMockRules(
  count: number,
  overrides: Partial<MockRule> | ((index: number) => Partial<MockRule>) = {}
): MockRule[] {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' ? overrides(index) : overrides;
    return createMockRule(itemOverrides);
  });
}

/**
 * Create a mock transactions API response
 */
export function createMockTransactionsResponse(
  transactions: MockTransaction[],
  options: { limit?: number; offset?: number } = {}
): MockTransactionsResponse {
  return {
    transactions,
    total: transactions.length,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  };
}

/**
 * Create a mock categories API response
 */
export function createMockCategoriesResponse(
  categories: MockCategory[]
): MockCategoriesResponse {
  return { categories };
}

/**
 * Create a mock rules API response
 */
export function createMockRulesResponse(rules: MockRule[]): MockRulesResponse {
  return { rules };
}

/**
 * Create a mock uncategorized response
 */
export function createMockUncategorizedResponse(
  total: number = 0,
  transactions: MockTransaction[] = []
): MockUncategorizedResponse {
  return { transactions, total };
}

/**
 * Create a mock apply rules response
 */
export function createMockApplyRulesResponse(
  categorized: number = 0,
  totalUncategorized: number = 0
): MockApplyRulesResponse {
  return {
    success: true,
    categorized,
    total_uncategorized: totalUncategorized,
  };
}

// Preset transactions

/**
 * Categorized grocery transaction
 */
export function groceryTransactionMock(overrides: Partial<MockTransaction> = {}): MockTransaction {
  return createMockTransaction({
    description: 'TESCO STORES',
    amount: -500,
    bank: 'CSOB',
    category_id: 1,
    category_name: 'Groceries',
    category_color: '#22c55e',
    ...overrides,
  });
}

/**
 * Categorized transport transaction
 */
export function transportTransactionMock(overrides: Partial<MockTransaction> = {}): MockTransaction {
  return createMockTransaction({
    description: 'UBER TRIP',
    amount: -200,
    bank: 'Raiffeisen',
    category_id: 2,
    category_name: 'Transport',
    category_color: '#3b82f6',
    ...overrides,
  });
}

/**
 * Uncategorized transaction
 */
export function uncategorizedTransactionMock(overrides: Partial<MockTransaction> = {}): MockTransaction {
  return createMockTransaction({
    description: 'UNKNOWN MERCHANT',
    amount: -150,
    bank: 'Revolut',
    category_id: null,
    category_name: null,
    category_color: null,
    ...overrides,
  });
}

/**
 * Income transaction (positive amount)
 */
export function incomeTransactionMock(overrides: Partial<MockTransaction> = {}): MockTransaction {
  return createMockTransaction({
    description: 'SALARY',
    amount: 50000,
    bank: 'CSOB',
    category_id: null,
    category_name: null,
    category_color: null,
    ...overrides,
  });
}

// Preset categories

/**
 * Groceries category preset
 */
export function groceriesCategoryMock(overrides: Partial<MockCategory> = {}): MockCategory {
  return createMockCategory({
    name: 'Groceries',
    color: '#22c55e',
    transaction_count: 10,
    ...overrides,
  });
}

/**
 * Transport category preset
 */
export function transportCategoryMock(overrides: Partial<MockCategory> = {}): MockCategory {
  return createMockCategory({
    name: 'Transport',
    color: '#3b82f6',
    transaction_count: 5,
    ...overrides,
  });
}

/**
 * Shopping category preset
 */
export function shoppingCategoryMock(overrides: Partial<MockCategory> = {}): MockCategory {
  return createMockCategory({
    name: 'Shopping',
    color: '#f59e0b',
    transaction_count: 3,
    ...overrides,
  });
}

// Preset rules

/**
 * Grocery store rule preset
 */
export function groceryRuleMock(overrides: Partial<MockRule> = {}): MockRule {
  return createMockRule({
    keyword: 'TESCO',
    category_id: 1,
    category_name: 'Groceries',
    ...overrides,
  });
}

/**
 * Transport rule preset
 */
export function transportRuleMock(overrides: Partial<MockRule> = {}): MockRule {
  return createMockRule({
    keyword: 'UBER',
    category_id: 2,
    category_name: 'Transport',
    ...overrides,
  });
}
