import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiRequestError } from '../api/client';
import { LoadingSpinner, ErrorMessage, DateRangePicker, useToast, EmptyState } from '../components';
import { TransactionTableSkeleton } from '@/components/skeletons/TransactionTableSkeleton';
import { useDateRangeParams } from '@/hooks/useDateRangeParams';
import type { DateRange } from '../utils/dateUtils';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { UNCATEGORIZED_COLOR } from '@/constants/colors';
import { GradientText } from '@/components/ui/gradient-text';

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
  const { dateRange, startDate, endDate } = useDateRangeParams();
  const { addToast } = useToast();

  // Data state
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<(Category & { transaction_count: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL params (non-date filters)
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

  // Single transaction categorize dialog state
  const [categorizeTransaction, setCategorizeTransaction] = useState<TransactionWithCategory | null>(null);
  const [singleCategoryId, setSingleCategoryId] = useState<number | null>(null);
  const [createRuleOnSingle, setCreateRuleOnSingle] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Delete confirmation state
  const [deleteTransaction, setDeleteTransaction] = useState<TransactionWithCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk categorize state
  const [showBulkCategorizeDialog, setShowBulkCategorizeDialog] = useState(false);
  const [bulkCategorizing, setBulkCategorizing] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null);
  const [createRuleOnCategorize, setCreateRuleOnCategorize] = useState(false);

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

  // Clear selection when transactions change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [transactions]);

  // Handle date range picker change - also persists to localStorage via the hook's effect
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

  // Handle single transaction category change (via dialog)
  const handleSingleCategorize = async () => {
    if (!categorizeTransaction || singleCategoryId === null) return;

    setUpdatingCategory(true);
    try {
      const response = await api.post<{
        updated: number;
        rule_created: boolean;
        rule_keyword: string | null;
      }>('/api/transactions/bulk-categorize', {
        ids: [categorizeTransaction.id],
        category_id: singleCategoryId,
        create_rule: createRuleOnSingle,
      });

      // Update local state with the new category
      const selectedCategory = categories.find(c => c.id === singleCategoryId);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === categorizeTransaction.id
            ? {
                ...t,
                category_id: singleCategoryId,
                category_name: selectedCategory?.name || null,
                category_color: selectedCategory?.color || null,
              }
            : t
        )
      );

      let message = 'Category updated';
      if (response.rule_created && response.rule_keyword) {
        message += ` and created rule "${response.rule_keyword}"`;
      }
      addToast('success', message);

      setCategorizeTransaction(null);
      setSingleCategoryId(null);
      setCreateRuleOnSingle(false);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to update category';
      addToast('error', message);
    } finally {
      setUpdatingCategory(false);
    }
  };

  // Open categorize dialog for a single transaction
  const openCategorizeDialog = (tx: TransactionWithCategory) => {
    setCategorizeTransaction(tx);
    setSingleCategoryId(tx.category_id);
    setCreateRuleOnSingle(false);
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

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setBulkDeleting(true);
    try {
      const response = await api.post<{ deleted: number }>('/api/transactions/bulk-delete', {
        ids: Array.from(selectedIds),
      });
      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setTotal((prev) => prev - response.deleted);
      addToast('success', `Deleted ${response.deleted} transaction${response.deleted !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to delete transactions';
      addToast('error', message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Handle bulk categorize
  const handleBulkCategorize = async () => {
    if (selectedIds.size === 0 || bulkCategoryId === null) return;

    setBulkCategorizing(true);
    try {
      const response = await api.post<{
        updated: number;
        rule_created: boolean;
        rule_keyword: string | null;
      }>('/api/transactions/bulk-categorize', {
        ids: Array.from(selectedIds),
        category_id: bulkCategoryId,
        create_rule: createRuleOnCategorize,
      });

      // Update local state with the new category
      const selectedCategory = categories.find(c => c.id === bulkCategoryId);
      setTransactions((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id)
            ? {
                ...t,
                category_id: bulkCategoryId,
                category_name: selectedCategory?.name || null,
                category_color: selectedCategory?.color || null,
              }
            : t
        )
      );

      let message = `Categorized ${response.updated} transaction${response.updated !== 1 ? 's' : ''}`;
      if (response.rule_created && response.rule_keyword) {
        message += ` and created rule "${response.rule_keyword}"`;
      }
      addToast('success', message);

      setSelectedIds(new Set());
      setShowBulkCategorizeDialog(false);
      setBulkCategoryId(null);
      setCreateRuleOnCategorize(false);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to categorize transactions';
      addToast('error', message);
    } finally {
      setBulkCategorizing(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTransaction) return;

    setDeleting(true);
    try {
      await api.delete(`/api/transactions/${deleteTransaction.id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTransaction.id));
      setTotal((prev) => prev - 1);
      addToast('success', 'Transaction deleted');
      setDeleteTransaction(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to delete transaction';
      addToast('error', message);
    } finally {
      setDeleting(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-50 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="text-2xl font-bold">
          <GradientText>Transactions</GradientText>
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowBulkCategorizeDialog(true)}
                className="w-full sm:w-auto"
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Categorize {selectedIds.size}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="w-full sm:w-auto"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete {selectedIds.size}
              </Button>
            </>
          )}
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
      <Card className="animate-fade-in-up opacity-0 animation-delay-100" style={{ animationFillMode: 'forwards' }}>
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

      {/* Empty State */}
      {!loading && !error && transactions.length === 0 && (
        <EmptyState
          illustration={
            <img
              src="/illustrations/empty-transactions.svg"
              alt=""
              className="w-40 h-30"
              aria-hidden="true"
            />
          }
          title="No transactions found"
          description="Try adjusting your filters or date range to find transactions."
        />
      )}

      {/* Table */}
      {!loading && !error && transactions.length > 0 && (
        <>
          <Card className="animate-fade-in-up opacity-0 animation-delay-200" style={{ animationFillMode: 'forwards' }}>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={transactions.length > 0 && selectedIds.size === transactions.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all transactions"
                    />
                  </TableHead>
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
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                    <TableRow key={tx.id} className={cn(selectedIds.has(tx.id) && "bg-muted/50")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={() => toggleSelect(tx.id)}
                          aria-label={`Select transaction ${tx.description}`}
                        />
                      </TableCell>
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
                        <button
                          type="button"
                          onClick={() => openCategorizeDialog(tx)}
                          className="flex items-center gap-2 hover:opacity-75 transition-opacity"
                        >
                          {tx.category_name ? (
                            <>
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tx.category_color || UNCATEGORIZED_COLOR }}
                              />
                              <span className="text-foreground">{tx.category_name}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Uncategorized</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTransaction(tx)}
                          title="Delete transaction"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTransaction} onOpenChange={(open) => !deleting && !open && setDeleteTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction?
              {deleteTransaction && (
                <span className="block mt-2 font-medium text-foreground">
                  {deleteTransaction.date} - {deleteTransaction.description} ({formatAmount(deleteTransaction.amount)})
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={(open) => !bulkDeleting && setShowBulkDeleteDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected transaction{selectedIds.size !== 1 ? 's' : ''}?
              <span className="block mt-2 text-muted-foreground">
                These transactions will be hidden from your reports but kept for duplicate detection on future imports.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Delete {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Transaction Categorize Dialog */}
      <Dialog
        open={!!categorizeTransaction}
        onOpenChange={(open) => {
          if (!updatingCategory && !open) {
            setCategorizeTransaction(null);
            setSingleCategoryId(null);
            setCreateRuleOnSingle(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorize Transaction</DialogTitle>
            <DialogDescription>
              {categorizeTransaction && (
                <span className="block mt-1 font-medium text-foreground truncate">
                  {categorizeTransaction.description}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="single-category-select">Category</Label>
              <select
                id="single-category-select"
                value={singleCategoryId ?? ''}
                onChange={(e) => setSingleCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {singleCategoryId !== null && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Options</Label>
                <Label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="single-categorize-option"
                    checked={!createRuleOnSingle}
                    onChange={() => setCreateRuleOnSingle(false)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Only this transaction</span>
                    <p className="text-sm text-muted-foreground">
                      Assign the category to this transaction only.
                    </p>
                  </div>
                </Label>
                <Label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="single-categorize-option"
                    checked={createRuleOnSingle}
                    onChange={() => setCreateRuleOnSingle(true)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Create a rule</span>
                    <p className="text-sm text-muted-foreground">
                      Also create a categorization rule to auto-categorize similar transactions.
                    </p>
                  </div>
                </Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCategorizeTransaction(null)}
              disabled={updatingCategory}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSingleCategorize}
              disabled={updatingCategory || singleCategoryId === null}
            >
              {updatingCategory && <LoadingSpinner size="sm" className="mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Categorize Dialog */}
      <Dialog
        open={showBulkCategorizeDialog}
        onOpenChange={(open) => {
          if (!bulkCategorizing) {
            setShowBulkCategorizeDialog(open);
            if (!open) {
              setBulkCategoryId(null);
              setCreateRuleOnCategorize(false);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorize {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Assign a category to the selected transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category-select">Category</Label>
              <select
                id="bulk-category-select"
                value={bulkCategoryId ?? ''}
                onChange={(e) => setBulkCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Options</Label>
              <Label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="categorize-option"
                  checked={!createRuleOnCategorize}
                  onChange={() => setCreateRuleOnCategorize(false)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">Only these transactions</span>
                  <p className="text-sm text-muted-foreground">
                    Assign the category to the selected transactions only.
                  </p>
                </div>
              </Label>
              <Label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="categorize-option"
                  checked={createRuleOnCategorize}
                  onChange={() => setCreateRuleOnCategorize(true)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">Create a rule</span>
                  <p className="text-sm text-muted-foreground">
                    Also create a categorization rule based on the transaction description to auto-categorize future imports.
                  </p>
                </div>
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBulkCategorizeDialog(false)}
              disabled={bulkCategorizing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCategorize}
              disabled={bulkCategorizing || bulkCategoryId === null}
            >
              {bulkCategorizing && <LoadingSpinner size="sm" className="mr-2" />}
              Categorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
