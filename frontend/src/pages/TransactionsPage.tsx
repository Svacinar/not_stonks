import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiRequestError } from '../api/client';
import { LoadingSpinner, ErrorMessage, DateRangePicker, useToast } from '../components';
import { TransactionTableSkeleton } from '@/components/skeletons/TransactionTableSkeleton';
import { getDefaultDateRange, type DateRange } from '../utils/dateUtils';
import type { Transaction, Category, BankName } from '../../../shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
  const { addToast } = useToast();

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
      addToast('error', message);
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
      addToast('error', message);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          <Button variant="outline" onClick={() => setShowExportModal(true)} className="w-full sm:w-auto">
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
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search */}
            <div className="flex-1 min-w-0 sm:min-w-48">
              <Label htmlFor="search-transactions" className="sr-only">
                Search descriptions
              </Label>
              <Input
                type="text"
                id="search-transactions"
                placeholder="Search descriptions..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Bank Checkboxes */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Banks:</span>
              {BANKS.map((bank) => (
                <Label
                  key={bank}
                  className="flex items-center gap-2 text-sm font-normal cursor-pointer min-h-[44px] sm:min-h-0"
                >
                  <Checkbox
                    checked={selectedBanks.includes(bank)}
                    onCheckedChange={() => handleBankToggle(bank)}
                  />
                  {bank}
                </Label>
              ))}
            </div>

            {/* Category Checkboxes */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Categories:</span>
              {categories.map((cat) => (
                <Label
                  key={cat.id}
                  className={cn(
                    "flex items-center gap-2 text-sm font-normal cursor-pointer min-h-[44px] sm:min-h-0",
                    uncategorizedOnly && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={selectedCategories.includes(String(cat.id))}
                    onCheckedChange={() => handleCategoryToggle(cat.id)}
                    disabled={uncategorizedOnly}
                  />
                  <span
                    className="w-4 h-4 rounded-full inline-block border border-border"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </Label>
              ))}
            </div>

            {/* Uncategorized Toggle */}
            <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer min-h-[44px] sm:min-h-0">
              <Checkbox
                checked={uncategorizedOnly}
                onCheckedChange={handleUncategorizedToggle}
              />
              Uncategorized only
            </Label>

            {/* Clear Filters */}
            {hasFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="min-h-[44px] sm:min-h-0">
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchTransactions} />}

      {/* Loading */}
      {loading && !error && <TransactionTableSkeleton rowCount={10} />}

      {/* Table */}
      {!loading && !error && (
        <>
          <Card>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('date')}
                    aria-sort={sortColumn === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Date{getSortIndicator('date')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('description')}
                    aria-sort={sortColumn === 'description' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Description{getSortIndicator('description')}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('amount')}
                    aria-sort={sortColumn === 'amount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Amount{getSortIndicator('amount')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('bank')}
                    aria-sort={sortColumn === 'bank' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Bank{getSortIndicator('bank')}
                  </TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap text-right font-medium",
                          tx.amount < 0 ? "text-destructive" : "text-success"
                        )}
                      >
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {tx.bank}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {editingTransactionId === tx.id ? (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`category-select-${tx.id}`} className="sr-only">
                              Select category for transaction
                            </Label>
                            <select
                              id={`category-select-${tx.id}`}
                              value={tx.category_id ?? ''}
                              onChange={(e) =>
                                handleCategoryChange(
                                  tx.id,
                                  e.target.value ? parseInt(e.target.value, 10) : null
                                )
                              }
                              disabled={updatingCategoryId === tx.id}
                              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingTransactionId(null)}
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
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingTransactionId(tx.id)}
                            className="flex items-center gap-2 hover:opacity-75 transition-opacity"
                          >
                            {tx.category_name ? (
                              <>
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tx.category_color || '#9ca3af' }}
                                />
                                <span className="text-foreground">{tx.category_name}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground italic">Uncategorized</span>
                            )}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing{' '}
                  <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(page * PAGE_SIZE, total)}
                  </span>{' '}
                  of <span className="font-medium text-foreground">{total}</span> transactions
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1 text-sm text-muted-foreground whitespace-nowrap">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total count when no pagination needed */}
          {totalPages <= 1 && total > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{total}</span> transaction
              {total !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={(open) => !exporting && setShowExportModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>
              {hasFilters
                ? 'Exporting filtered transactions. Choose a format:'
                : 'Exporting all transactions. Choose a format:'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 py-4">
            <Button
              className="flex-1"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting && <LoadingSpinner size="sm" className="mr-2" />}
              Download CSV
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              {exporting && <LoadingSpinner size="sm" className="mr-2" />}
              Download JSON
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowExportModal(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
