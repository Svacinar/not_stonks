import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDateRangeParams } from '@/hooks/useDateRangeParams';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { api, ApiRequestError } from '../api/client';
import { ErrorMessage, DateRangePicker, EmptyState } from '../components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { GradientText } from '@/components/ui/gradient-text';
import { DollarSign, ClipboardList, Calculator, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { BANK_COLORS, CHART_COLORS_HEX, UNCATEGORIZED_COLOR } from '@/constants/colors';
import { useChartTheme } from '@/hooks/useChartTheme';
import { formatDateForDisplay } from '../utils/dateUtils';
import type { TransactionStats, Transaction, BankName, Category } from '../../../shared/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  categories: Category[];
}

// Format currency in CZK
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

// Generate all months between two dates (inclusive)
function generateMonthRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];

  const months: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  // Start from the first day of the start month
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function DashboardPage() {
  const { dateRange, startDate, endDate, setDateRange, searchParams } = useDateRangeParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create maps from category name to color and id
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => {
      map.set(cat.name, cat.color);
    });
    return map;
  }, [categories]);

  const categoryIdMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach(cat => {
      map.set(cat.name, cat.id);
    });
    return map;
  }, [categories]);

  // Handle pie chart click - navigate to transactions with category filter
  const handlePieClick = useCallback((categoryName: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    if (categoryName === 'Uncategorized') {
      params.set('uncategorized', 'true');
    } else {
      const categoryId = categoryIdMap.get(categoryName);
      if (categoryId) {
        params.set('category', String(categoryId));
      }
    }

    navigate(`/transactions?${params.toString()}`);
  }, [startDate, endDate, categoryIdMap, navigate]);

  // Fetch stats, categories, and recent transactions
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      // Fetch stats, categories, and recent transactions in parallel
      const [statsData, categoriesData, transactionsData] = await Promise.all([
        api.get<TransactionStats>(`/api/transactions/stats?${params.toString()}`),
        api.get<CategoryListResponse>('/api/categories'),
        api.get<TransactionListResponse>(`/api/transactions?${params.toString()}&limit=10&sort=date&order=desc`),
      ]);

      setStats(statsData);
      setCategories(categoriesData.categories);
      setRecentTransactions(transactionsData.transactions);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Calculate derived stats
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    // Calculate total spending from expenses only (negative amounts)
    const expenseCategories = stats.by_category.filter(c => c.sum < 0);
    const totalSpending = expenseCategories.reduce((sum, c) => sum + Math.abs(c.sum), 0);
    
    const transactionCount = stats.total_count;
    const averageTransaction = transactionCount > 0 ? totalSpending / transactionCount : 0;

    // Find largest expense category (only from expenses, not income)
    const expenseAmounts = expenseCategories.map(c => Math.abs(c.sum));
    const largestExpense = expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0;

    return {
      totalSpending,
      transactionCount,
      averageTransaction,
      largestExpense,
    };
  }, [stats]);

  // Theme-aware chart options
  const {
    colors: chartColors,
    getLineChartOptions,
    getBarChartOptions,
    getPieChartOptions,
    createGradient
  } = useChartTheme();

  // Pie chart data for spending by category (expenses only, ignore income)
  const categoryPieData = useMemo(() => {
    if (!stats || stats.by_category.length === 0) return null;

    // Filter to only show expenses (negative sums), excluding Income
    const expenses = stats.by_category.filter(c => c.sum < 0 && c.name !== 'Income');

    // Return null if no expenses to show
    if (expenses.length === 0) return null;

    // Use category colors from the color map, fallback to chart colors for missing
    let fallbackIndex = 0;
    const colors = expenses.map(c => {
      if (c.name === 'Uncategorized') {
        return UNCATEGORIZED_COLOR;
      }
      // Use the category's stored color, or fallback to chart colors
      return categoryColorMap.get(c.name) || CHART_COLORS_HEX[fallbackIndex++ % CHART_COLORS_HEX.length];
    });

    return {
      labels: expenses.map(c => c.name),
      datasets: [{
        data: expenses.map(c => Math.abs(c.sum)),
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 8,
      }],
    };
  }, [stats, categoryColorMap]);

  // Bar chart data for spending by bank
  const bankBarData = useMemo(() => {
    if (!stats || stats.by_bank.length === 0) return null;

    return {
      labels: stats.by_bank.map(b => b.name),
      datasets: [{
        label: 'Spending',
        data: stats.by_bank.map(b => Math.abs(b.sum)),
        backgroundColor: stats.by_bank.map(b => BANK_COLORS[b.name as BankName] || UNCATEGORIZED_COLOR),
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }, [stats]);

  // Generate full month range for charts
  const allMonths = useMemo(() => generateMonthRange(startDate, endDate), [startDate, endDate]);

  // Line chart data for spending over time
  const timeLineData = useMemo(() => {
    if (!stats) return null;

    // Use full month range if available, otherwise fall back to data months
    const months = allMonths.length > 0 ? allMonths : stats.by_month.map(m => m.month);
    if (months.length === 0) return null;

    // Create a map of existing data for quick lookup
    const dataMap = new Map(stats.by_month.map(m => [m.month, Math.abs(m.sum)]));

    return {
      labels: months.map(m => {
        const [year, month] = m.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('cs-CZ', {
          month: 'short',
          year: '2-digit',
        });
      }),
      datasets: [{
        label: 'Monthly Spending',
        data: months.map(m => dataMap.get(m) || 0),
        borderColor: chartColors.spendingLine,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number; left: number; right: number; width: number; height: number } } }) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return chartColors.spendingFill;
          return createGradient(ctx, chartArea, chartColors.spendingRGB);
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: chartColors.spendingLine,
        pointBorderColor: chartColors.tooltipBackground,
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: chartColors.spendingLine,
        pointHoverBorderColor: chartColors.tooltipBackground,
        pointHoverBorderWidth: 3,
      }],
    };
  }, [stats, chartColors, createGradient, allMonths]);

  // Line chart data for income over time
  const incomeLineData = useMemo(() => {
    if (!stats) return null;

    // Use full month range if available, otherwise fall back to data months
    const incomeMonths = stats.income_by_month || [];
    const months = allMonths.length > 0 ? allMonths : incomeMonths.map(m => m.month);
    if (months.length === 0) return null;

    // Create a map of existing data for quick lookup
    const dataMap = new Map(incomeMonths.map(m => [m.month, m.sum]));

    return {
      labels: months.map(m => {
        const [year, month] = m.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('cs-CZ', {
          month: 'short',
          year: '2-digit',
        });
      }),
      datasets: [{
        label: 'Monthly Income',
        data: months.map(m => dataMap.get(m) || 0),
        borderColor: chartColors.incomeLine,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number; left: number; right: number; width: number; height: number } } }) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return chartColors.incomeFill;
          return createGradient(ctx, chartArea, chartColors.incomeRGB);
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: chartColors.incomeLine,
        pointBorderColor: chartColors.tooltipBackground,
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: chartColors.incomeLine,
        pointHoverBorderColor: chartColors.tooltipBackground,
        pointHoverBorderWidth: 3,
      }],
    };
  }, [stats, chartColors, createGradient, allMonths]);

  // Chart options - modern premium styling with click handler
  const pieOptions = useMemo(() => ({
    ...getPieChartOptions,
    onClick: (_event: unknown, elements: { index: number }[]) => {
      if (elements.length > 0 && categoryPieData) {
        const index = elements[0].index;
        const categoryName = categoryPieData.labels[index];
        if (categoryName) {
          handlePieClick(categoryName);
        }
      }
    },
    plugins: {
      ...getPieChartOptions.plugins,
      tooltip: {
        ...getPieChartOptions.plugins.tooltip,
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            return `${context.label}: ${formatCurrency(context.parsed)}`;
          },
        },
      },
    },
  }), [getPieChartOptions, categoryPieData, handlePieClick]);

  const barOptions = useMemo(() => ({
    ...getBarChartOptions,
    plugins: {
      ...getBarChartOptions.plugins,
      legend: {
        display: false,
      },
      tooltip: {
        ...getBarChartOptions.plugins.tooltip,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      ...getBarChartOptions.scales,
      y: {
        ...getBarChartOptions.scales.y,
        beginAtZero: true,
        ticks: {
          ...getBarChartOptions.scales.y.ticks,
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }), [getBarChartOptions]);

  const lineOptions = useMemo(() => ({
    ...getLineChartOptions,
    plugins: {
      ...getLineChartOptions.plugins,
      legend: {
        display: false,
      },
      tooltip: {
        ...getLineChartOptions.plugins.tooltip,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      ...getLineChartOptions.scales,
      y: {
        ...getLineChartOptions.scales.y,
        beginAtZero: true,
        ticks: {
          ...getLineChartOptions.scales.y.ticks,
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }), [getLineChartOptions]);

  // Check if we have any data
  const hasData = stats && stats.total_count > 0;

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="text-2xl font-bold">
          <GradientText>Dashboard</GradientText>
        </h1>

        {/* Date Range Selector */}
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Loading */}
      {loading && !error && <DashboardSkeleton />}

      {/* Empty State */}
      {!loading && !error && !hasData && (
        <EmptyState
          illustration={
            <img
              src="/illustrations/empty-dashboard.svg"
              alt=""
              className="w-40 h-30"
              aria-hidden="true"
            />
          }
          title="No data available"
          description="Upload some bank statements to see your spending dashboard."
          action={
            <Button asChild>
              <Link to="/upload">Upload Statements</Link>
            </Button>
          }
        />
      )}

      {/* Dashboard Content */}
      {!loading && !error && hasData && derivedStats && (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spending */}
            <StatCard
              variant="danger"
              title="Total Spending"
              value={formatCurrency(derivedStats.totalSpending)}
              icon={<DollarSign className="w-6 h-6 text-destructive" />}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            />

            {/* Transaction Count */}
            <StatCard
              variant="default"
              title="Transactions"
              value={derivedStats.transactionCount.toLocaleString('cs-CZ')}
              icon={<ClipboardList className="w-6 h-6 text-primary" />}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
            />

            {/* Average Transaction */}
            <StatCard
              variant="default"
              title="Average"
              value={formatCurrency(derivedStats.averageTransaction)}
              icon={<Calculator className="w-6 h-6 text-primary" />}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            />

            {/* Largest Category */}
            <StatCard
              variant="warning"
              title="Largest Category"
              value={formatCurrency(derivedStats.largestExpense)}
              icon={<TrendingUp className="w-6 h-6 text-amber-500" />}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0 animation-delay-300" style={{ animationFillMode: 'forwards' }}>
            {/* Spending by Category Pie Chart */}
            <Card elevation="md" className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                  <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {categoryPieData ? (
                  <div className="h-72 cursor-pointer" title="Click to view transactions">
                    <Pie data={categoryPieData} options={pieOptions} />
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending by Bank Bar Chart */}
            <Card elevation="md" className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-chart-2 to-chart-2/40" />
                  <CardTitle className="text-lg font-semibold">Spending by Bank</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {bankBarData ? (
                  <div className="h-72">
                    <Bar data={bankBarData} options={barOptions} />
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    No bank data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Spending and Income Over Time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up opacity-0 animation-delay-400" style={{ animationFillMode: 'forwards' }}>
            {/* Spending Over Time Line Chart */}
            <Card elevation="md" className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-destructive to-destructive/40" />
                  <CardTitle className="text-lg font-semibold">Spending Over Time</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {timeLineData ? (
                  <div className="h-72">
                    <Line data={timeLineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    No spending data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Over Time Line Chart */}
            <Card elevation="md" className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-gradient-to-b from-success to-success/40" />
                  <CardTitle className="text-lg font-semibold">Income Over Time</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {incomeLineData ? (
                  <div className="h-72">
                    <Line data={incomeLineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    No income data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transactions in selected period */}
          <Card className="animate-fade-in-up opacity-0 animation-delay-500" style={{ animationFillMode: 'forwards' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Latest Transactions</CardTitle>
              <Button variant="link" asChild className="p-0 h-auto">
                <Link to={`/transactions?${searchParams.toString()}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No transactions in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateForDisplay(tx.date)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-medium ${
                          tx.amount < 0 ? 'text-destructive' : 'text-success'
                        }`}>
                          {tx.amount < 0 ? '-' : ''}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {tx.category_name ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tx.category_color || UNCATEGORIZED_COLOR }}
                              />
                              {tx.category_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Uncategorized</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
