/**
 * Pre-built Mock Data Sets
 *
 * Common mock data configurations used across multiple test files.
 * Import these directly for quick test setup.
 */

import {
  createMockTransactionsResponse,
  createMockCategoriesResponse,
  createMockRulesResponse,
  createMockUncategorizedResponse,
  groceryTransactionMock,
  transportTransactionMock,
  incomeTransactionMock,
  groceriesCategoryMock,
  transportCategoryMock,
  groceryRuleMock,
  transportRuleMock,
  type MockTransaction,
  type MockCategory,
  type MockRule,
  type MockTransactionsResponse,
  type MockCategoriesResponse,
  type MockRulesResponse,
  type MockUncategorizedResponse,
} from './factories';

/**
 * Standard set of transactions for testing
 * Includes categorized and uncategorized transactions
 */
export const standardTransactions: MockTransaction[] = [
  {
    id: 1,
    date: '2024-06-15',
    description: 'TESCO STORES',
    amount: -500,
    bank: 'CSOB',
    category_id: 1,
    category_name: 'Groceries',
    category_color: '#22c55e',
  },
  {
    id: 2,
    date: '2024-06-14',
    description: 'UBER TRIP',
    amount: -200,
    bank: 'Raiffeisen',
    category_id: 2,
    category_name: 'Transport',
    category_color: '#3b82f6',
  },
  {
    id: 3,
    date: '2024-06-13',
    description: 'SALARY',
    amount: 50000,
    bank: 'CSOB',
    category_id: null,
    category_name: null,
    category_color: null,
  },
];

/**
 * Standard transactions API response
 */
export const standardTransactionsResponse: MockTransactionsResponse = {
  transactions: standardTransactions,
  total: 3,
  limit: 50,
  offset: 0,
};

/**
 * Standard set of categories for testing
 */
export const standardCategories: MockCategory[] = [
  { id: 1, name: 'Groceries', color: '#22c55e', transaction_count: 10 },
  { id: 2, name: 'Transport', color: '#3b82f6', transaction_count: 5 },
];

/**
 * Standard categories API response
 */
export const standardCategoriesResponse: MockCategoriesResponse = {
  categories: standardCategories,
};

/**
 * Standard set of rules for testing
 */
export const standardRules: MockRule[] = [
  {
    id: 1,
    keyword: 'TESCO',
    category_id: 1,
    category_name: 'Groceries',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    keyword: 'UBER',
    category_id: 2,
    category_name: 'Transport',
    created_at: '2024-01-02T00:00:00Z',
  },
];

/**
 * Standard rules API response
 */
export const standardRulesResponse: MockRulesResponse = {
  rules: standardRules,
};

/**
 * Standard uncategorized count response
 */
export const standardUncategorizedResponse: MockUncategorizedResponse = {
  transactions: [],
  total: 25,
};

/**
 * Empty state responses for testing empty states
 */
export const emptyTransactionsResponse: MockTransactionsResponse = {
  transactions: [],
  total: 0,
  limit: 50,
  offset: 0,
};

export const emptyRulesResponse: MockRulesResponse = {
  rules: [],
};

export const noUncategorizedResponse: MockUncategorizedResponse = {
  transactions: [],
  total: 0,
};

/**
 * Paginated response for testing pagination
 */
export const paginatedTransactionsResponse: MockTransactionsResponse = {
  transactions: standardTransactions,
  total: 100,
  limit: 50,
  offset: 0,
};

/**
 * Dashboard stats mock data
 */
export const standardDashboardStats = {
  total_count: 100,
  total_amount: -50000,
  by_category: [
    { name: 'Groceries', count: 30, sum: -15000, color: '#22c55e' },
    { name: 'Transport', count: 20, sum: -10000, color: '#3b82f6' },
    { name: 'Shopping', count: 15, sum: -8000, color: '#f59e0b' },
    { name: 'Uncategorized', count: 35, sum: -17000, color: '#9ca3af' },
  ],
  by_bank: [
    { name: 'CSOB', count: 40, sum: -20000 },
    { name: 'Raiffeisen', count: 30, sum: -15000 },
    { name: 'Revolut', count: 30, sum: -15000 },
  ],
  by_month: [
    { month: '2024-04', count: 30, sum: -15000 },
    { month: '2024-05', count: 35, sum: -17500 },
    { month: '2024-06', count: 35, sum: -17500 },
  ],
  date_range: {
    min: '2024-04-01',
    max: '2024-06-30',
  },
};

/**
 * Helper to create a modified standard response
 * Useful when you need slight variations of standard data
 */
export function withTransactions(
  transactions: MockTransaction[],
  options: { total?: number; limit?: number; offset?: number } = {}
): MockTransactionsResponse {
  return {
    transactions,
    total: options.total ?? transactions.length,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  };
}

export function withCategories(categories: MockCategory[]): MockCategoriesResponse {
  return { categories };
}

export function withRules(rules: MockRule[]): MockRulesResponse {
  return { rules };
}

export function withUncategorized(total: number): MockUncategorizedResponse {
  return { transactions: [], total };
}
