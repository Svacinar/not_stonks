import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiRequestError } from '../api/client';
import { LoadingSpinner, ErrorMessage, DateRangePicker } from '../components';
import { getDefaultDateRange, type DateRange } from '../utils/dateUtils';
import type { Transaction, Category, BankName } from '../../../shared/types';

interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

interface TransactionListResponse {
  transactions: TransactionWithCategory[];
  total: number;
  limit: number;
  offset: number;
}

interface CategoryListResponse {
  categories: (Category & { transaction_count: number })[];
}

type SortColumn = 'date' | 'amount' | 'description' | 'bank';
type SortOrder = 'asc' | 'desc';

const BANKS: BankName[] = ['CSOB', 'Raiffeisen', 'Revolut'];
const PAGE_SIZE = 50;

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<(Category & { transaction_count: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL params
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const bankParam = searchParams.get('bank') || '';
  const categoryParam = searchParams.get('category') || '';
  const selectedBanks = useMemo(
    () => bankParam.split(',').filter(Boolean),
    [bankParam]
  );
  const selectedCategories = useMemo(
    () => categoryParam.split(',').filter(Boolean),
    [categoryParam]
  );
  const uncategorizedOnly = searchParams.get('uncategorized') === 'true';
  const searchQuery = searchParams.get('search') || '';
  const sortColumn = (searchParams.get('sort') as SortColumn) || 'date';
  const sortOrder = (searchParams.get('order') as SortOrder) || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Initialize with default date range if no dates in URL
  useEffect(() => {
    if (!searchParams.has('startDate') && !searchParams.has('endDate')) {
      const defaultRange = getDefaultDateRange();
      const newParams = new URLSearchParams(searchParams);
      newParams.set('startDate', defaultRange.startDate);
      newParams.set('endDate', defaultRange.endDate);
      setSearchParams(newParams, { replace: true });
    }
  }, []); // Only run on mount

  // Derived date range for the picker component
  const dateRange: DateRange = useMemo(
    () => ({
      startDate: startDate,
      endDate: endDate,
    }),
    [startDate, endDate]
  );

  // Inline editing state
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<number | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<CategoryListResponse>('/api/categories');
        setCategories(response.categories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedBanks.length > 0) params.set('bank', selectedBanks.join(','));
      if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
      if (uncategorizedOnly) params.set('uncategorized', 'true');
      if (searchQuery) params.set('search', searchQuery);
      params.set('sort', sortColumn);
      params.set('order', sortOrder);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));

      const response = await api.get<TransactionListResponse>(
        `/api/transactions?${params.toString()}`
      );
      setTransactions(response.transactions);
      setTotal(response.total);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to load transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    selectedBanks,
    selectedCategories,
    uncategorizedOnly,
    searchQuery,
    sortColumn,
    sortOrder,
    page,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle date range picker change
  const handleDateRangeChange = (range: DateRange) => {
    updateParams({
      startDate: range.startDate || null,
      endDate: range.endDate || null,
      page: null, // Reset to page 1
    });
  };

  const handleBankToggle = (bank: BankName) => {
    const newBanks = selectedBanks.includes(bank)
      ? selectedBanks.filter((b) => b !== bank)
      : [...selectedBanks, bank];
    updateParams({
      bank: newBanks.length > 0 ? newBanks.join(',') : null,
      page: null,
    });
  };

  const handleCategoryToggle = (categoryId: number) => {
    const idStr = String(categoryId);
    const newCategories = selectedCategories.includes(idStr)
      ? selectedCategories.filter((c) => c !== idStr)
      : [...selectedCategories, idStr];
    updateParams({
      category: newCategories.length > 0 ? newCategories.join(',') : null,
      page: null,
    });
  };

  const handleUncategorizedToggle = () => {
    updateParams({
      uncategorized: uncategorizedOnly ? null : 'true',
      category: null, // Clear category filter when toggling uncategorized
      page: null,
    });
  };

  const handleSearchChange = (value: string) => {
    updateParams({
      search: value || null,
      page: null,
    });
  };

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sort: column, order: 'desc' });
    }
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Handle inline category edit
  const handleCategoryChange = async (transactionId: number, categoryId: number | null) => {
    setUpdatingCategoryId(transactionId);
    try {
      const updated = await api.patch<TransactionWithCategory>(
        `/api/transactions/${transactionId}`,
        { category_id: categoryId }
      );
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? updated : t))
      );
      setEditingTransactionId(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to update category';
      alert(message);
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedBanks.length > 0) params.set('bank', selectedBanks.join(','));
      if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
      if (uncategorizedOnly) params.set('uncategorized', 'true');
      if (searchQuery) params.set('search', searchQuery);
      params.set('format', format);

      const { blob, filename } = await api.download(
        `/api/export/transactions?${params.toString()}`
      );

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to export';
      alert(message);
    } finally {
      setExporting(false);
    }
  };

  // Format amount with color
  const formatAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
    }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  // Get sort indicator
  const getSortIndicator = (column: SortColumn) => {
    if (column !== sortColumn) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters =
    startDate ||
    endDate ||
    selectedBanks.length > 0 ||
    selectedCategories.length > 0 ||
    uncategorizedOnly ||
    searchQuery;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Date Range */}
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

          {/* Search */}
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder="Search descriptions..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Bank Checkboxes */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Banks:</span>
            {BANKS.map((bank) => (
              <label key={bank} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedBanks.includes(bank)}
                  onChange={() => handleBankToggle(bank)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {bank}
              </label>
            ))}
          </div>

          {/* Category Checkboxes */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(String(cat.id))}
                  onChange={() => handleCategoryToggle(cat.id)}
                  disabled={uncategorizedOnly}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </label>
            ))}
          </div>

          {/* Uncategorized Toggle */}
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={uncategorizedOnly}
              onChange={handleUncategorizedToggle}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Uncategorized only
          </label>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchTransactions} />}

      {/* Loading */}
      {loading && !error && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      Date{getSortIndicator('date')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('description')}
                    >
                      Description{getSortIndicator('description')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      Amount{getSortIndicator('amount')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('bank')}
                    >
                      Bank{getSortIndicator('bank')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatAmount(tx.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tx.bank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingTransactionId === tx.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={tx.category_id ?? ''}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    tx.id,
                                    e.target.value ? parseInt(e.target.value, 10) : null
                                  )
                                }
                                disabled={updatingCategoryId === tx.id}
                                className="rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                autoFocus
                              >
                                <option value="">Uncategorized</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                              {updatingCategoryId === tx.id && (
                                <LoadingSpinner size="sm" />
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingTransactionId(null)}
                                className="text-gray-400 hover:text-gray-600"
                                disabled={updatingCategoryId === tx.id}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingTransactionId(tx.id)}
                              className="flex items-center gap-2 hover:opacity-75"
                            >
                              {tx.category_name ? (
                                <>
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tx.category_color || '#9ca3af' }}
                                  />
                                  <span className="text-gray-900">{tx.category_name}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 italic">Uncategorized</span>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
              <div className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{' '}
                of <span className="font-medium">{total}</span> transactions
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Total count when no pagination needed */}
          {totalPages <= 1 && total > 0 && (
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{total}</span> transaction
              {total !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => !exporting && setShowExportModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Export Transactions
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {hasFilters
                  ? 'Exporting filtered transactions. Choose a format:'
                  : 'Exporting all transactions. Choose a format:'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {exporting ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {exporting ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Download JSON
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="mt-4 w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
