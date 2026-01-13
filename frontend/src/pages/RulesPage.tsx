import { useState, useEffect, useCallback } from 'react';
import { api, ApiRequestError } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RulesTableSkeleton } from '@/components/skeletons/RulesTableSkeleton';
import type { Category, CategoryRule } from '../../../shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface RuleWithCategory extends CategoryRule {
  category_name: string;
}

interface RulesListResponse {
  rules: RuleWithCategory[];
}

interface CategoryListResponse {
  categories: (Category & { transaction_count: number })[];
}

interface ApplyRulesResponse {
  success: boolean;
  categorized: number;
  total_uncategorized?: number;
  message?: string;
}

interface UncategorizedCountResponse {
  transactions: unknown[];
  total: number;
}

export function RulesPage() {
  // Data state
  const [rules, setRules] = useState<RuleWithCategory[]>([]);
  const [categories, setCategories] = useState<(Category & { transaction_count: number })[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const [addingRule, setAddingRule] = useState(false);

  // Edit state
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation state
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Apply rules state
  const [applyingRules, setApplyingRules] = useState(false);
  const [applyResult, setApplyResult] = useState<{ categorized: number; total: number } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rulesRes, categoriesRes, uncategorizedRes] = await Promise.all([
        api.get<RulesListResponse>('/api/rules'),
        api.get<CategoryListResponse>('/api/categories'),
        api.get<UncategorizedCountResponse>('/api/transactions?uncategorized=true&limit=0'),
      ]);

      setRules(rulesRes.rules);
      setCategories(categoriesRes.categories);
      setUncategorizedCount(uncategorizedRes.total);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add new rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyword.trim() || newCategoryId === '') {
      return;
    }

    setAddingRule(true);
    setError(null);

    try {
      const newRule = await api.post<RuleWithCategory>('/api/rules', {
        keyword: newKeyword.trim(),
        category_id: newCategoryId,
      });

      setRules((prev) => [...prev, newRule].sort((a, b) => a.keyword.localeCompare(b.keyword)));
      setNewKeyword('');
      setNewCategoryId('');
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to add rule';
      setError(message);
    } finally {
      setAddingRule(false);
    }
  };

  // Start editing a rule
  const handleStartEdit = (rule: RuleWithCategory) => {
    setEditingRuleId(rule.id);
    setEditKeyword(rule.keyword);
    setEditCategoryId(rule.category_id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setEditKeyword('');
    setEditCategoryId('');
  };

  // Save edited rule
  const handleSaveEdit = async () => {
    if (!editKeyword.trim() || editCategoryId === '' || editingRuleId === null) {
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      const updatedRule = await api.patch<RuleWithCategory>(`/api/rules/${editingRuleId}`, {
        keyword: editKeyword.trim(),
        category_id: editCategoryId,
      });

      setRules((prev) =>
        prev
          .map((r) => (r.id === editingRuleId ? updatedRule : r))
          .sort((a, b) => a.keyword.localeCompare(b.keyword))
      );
      handleCancelEdit();
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to update rule';
      setError(message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: number) => {
    setDeletingRuleId(ruleId);
    setError(null);

    try {
      await api.delete(`/api/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setShowDeleteConfirm(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to delete rule';
      setError(message);
    } finally {
      setDeletingRuleId(null);
    }
  };

  // Apply rules to uncategorized transactions
  const handleApplyRules = async () => {
    setApplyingRules(true);
    setApplyResult(null);
    setError(null);

    try {
      const result = await api.post<ApplyRulesResponse>('/api/rules/apply');
      setApplyResult({
        categorized: result.categorized,
        total: result.total_uncategorized || uncategorizedCount,
      });

      // Refresh uncategorized count
      const uncategorizedRes = await api.get<UncategorizedCountResponse>(
        '/api/transactions?uncategorized=true&limit=0'
      );
      setUncategorizedCount(uncategorizedRes.total);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to apply rules';
      setError(message);
    } finally {
      setApplyingRules(false);
    }
  };

  // Get category color
  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#9ca3af';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categorization Rules</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            <span className="font-medium">{uncategorizedCount}</span> uncategorized transaction
            {uncategorizedCount !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={handleApplyRules}
            disabled={applyingRules || rules.length === 0 || uncategorizedCount === 0}
          >
            {applyingRules ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Applying...
              </>
            ) : (
              'Apply Rules'
            )}
          </Button>
        </div>
      </div>

      {/* Apply Result */}
      {applyResult && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4" role="status">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-400 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-green-700 dark:text-green-300">
              Categorized <span className="font-medium">{applyResult.categorized}</span> of{' '}
              <span className="font-medium">{applyResult.total}</span> uncategorized transactions
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setApplyResult(null)}
              className="ml-auto h-6 w-6 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Add New Rule Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add New Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddRule} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-48 space-y-2">
              <Label htmlFor="newKeyword">Keyword</Label>
              <Input
                type="text"
                id="newKeyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword..."
                disabled={addingRule}
              />
            </div>
            <div className="flex-1 min-w-48 space-y-2">
              <Label htmlFor="newCategory">Category</Label>
              <select
                id="newCategory"
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={addingRule}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={addingRule || !newKeyword.trim() || newCategoryId === ''}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {addingRule ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Adding...
                </>
              ) : (
                'Add Rule'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && <RulesTableSkeleton rowCount={5} />}

      {/* Rules Table */}
      {!loading && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    No rules defined yet. Add a rule above to auto-categorize transactions.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="whitespace-nowrap">
                      {editingRuleId === rule.id ? (
                        <>
                          <label htmlFor={`edit-keyword-${rule.id}`} className="sr-only">
                            Edit keyword
                          </label>
                          <Input
                            type="text"
                            id={`edit-keyword-${rule.id}`}
                            value={editKeyword}
                            onChange={(e) => setEditKeyword(e.target.value)}
                            className="max-w-xs"
                            disabled={savingEdit}
                            autoFocus
                          />
                        </>
                      ) : (
                        <span className="font-mono text-foreground">{rule.keyword}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {editingRuleId === rule.id ? (
                        <>
                          <label htmlFor={`edit-category-${rule.id}`} className="sr-only">
                            Edit category
                          </label>
                          <select
                            id={`edit-category-${rule.id}`}
                            value={editCategoryId}
                            onChange={(e) =>
                              setEditCategoryId(e.target.value ? parseInt(e.target.value, 10) : '')
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={savingEdit}
                          >
                            <option value="">Select category...</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(rule.category_id) }}
                          />
                          <span className="text-foreground">{rule.category_name}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(rule.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {editingRuleId === rule.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            disabled={savingEdit || !editKeyword.trim() || editCategoryId === ''}
                            className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                          >
                            {savingEdit ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(rule)}
                            className="h-8 w-8 text-primary hover:text-primary/80"
                            title="Edit rule"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Button>
                          <AlertDialog
                            open={showDeleteConfirm === rule.id}
                            onOpenChange={(open) => setShowDeleteConfirm(open ? rule.id : null)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowDeleteConfirm(rule.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              title="Delete rule"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the rule for keyword "{rule.keyword}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deletingRuleId === rule.id}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRule(rule.id)}
                                  disabled={deletingRuleId === rule.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingRuleId === rule.id ? (
                                    <>
                                      <LoadingSpinner size="sm" className="mr-2" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Rules count */}
      {!loading && rules.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{rules.length}</span> rule{rules.length !== 1 ? 's' : ''} defined
        </div>
      )}
    </div>
  );
}
