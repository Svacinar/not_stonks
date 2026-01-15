import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import {
  getDefaultDateRange,
  formatDateForDisplay,
  type DateRange,
} from '../utils/dateUtils';
import type { TransactionStats, Transaction, BankName } from '../../../shared/types';

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

// Format currency in CZK
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export function DashboardPage() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state - default to last 3 months
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  // Fetch stats and recent transactions
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      // Fetch stats and recent transactions in parallel
      const [statsData, transactionsData] = await Promise.all([
        api.get<TransactionStats>(`/api/transactions/stats?${params.toString()}`),
        api.get<TransactionListResponse>(`/api/transactions?${params.toString()}&limit=10&sort=date&order=desc`),
      ]);

      setStats(statsData);
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
  }, [dateRange]);

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
  const { colors: chartColors, getDefaultOptions } = useChartTheme();

  // Pie chart data for spending by category (expenses only, ignore income)
  const categoryPieData = useMemo(() => {
    if (!stats || stats.by_category.length === 0) return null;

    // Filter to only show expenses (negative sums), excluding Income
    const expenses = stats.by_category.filter(c => c.sum < 0 && c.name !== 'Income');

    // Return null if no expenses to show
    if (expenses.length === 0) return null;

    // Assign colors: gray for Uncategorized, chart colors for others
    let colorIndex = 0;
    const colors = expenses.map(c => {
      if (c.name === 'Uncategorized') {
        return UNCATEGORIZED_COLOR;
      }
      return CHART_COLORS_HEX[colorIndex++ % CHART_COLORS_HEX.length];
    });

    return {
      labels: expenses.map(c => c.name),
      datasets: [{
        data: expenses.map(c => Math.abs(c.sum)),
        backgroundColor: colors,
        borderColor: chartColors.tooltipBackground,
        borderWidth: 2,
      }],
    };
  }, [stats, chartColors.tooltipBackground]);

  // Bar chart data for spending by bank
  const bankBarData = useMemo(() => {
    if (!stats || stats.by_bank.length === 0) return null;

    return {
      labels: stats.by_bank.map(b => b.name),
      datasets: [{
        label: 'Spending',
        data: stats.by_bank.map(b => Math.abs(b.sum)),
        backgroundColor: stats.by_bank.map(b => BANK_COLORS[b.name as BankName] || UNCATEGORIZED_COLOR),
        borderColor: chartColors.tooltipBackground,
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }, [stats, chartColors.tooltipBackground]);

  // Line chart data for spending over time
  const timeLineData = useMemo(() => {
    if (!stats || stats.by_month.length === 0) return null;

    return {
      labels: stats.by_month.map(m => {
        const [year, month] = m.month.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('cs-CZ', {
          month: 'short',
          year: '2-digit',
        });
      }),
      datasets: [{
        label: 'Monthly Spending',
        data: stats.by_month.map(m => Math.abs(m.sum)),
        borderColor: chartColors.spendingLine,
        backgroundColor: chartColors.spendingFill,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: chartColors.spendingLine,
        pointBorderColor: chartColors.tooltipBackground,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    };
  }, [stats, chartColors]);

  // Line chart data for income over time
  const incomeLineData = useMemo(() => {
    if (!stats || !stats.income_by_month || stats.income_by_month.length === 0) return null;

    return {
      labels: stats.income_by_month.map(m => {
        const [year, month] = m.month.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('cs-CZ', {
          month: 'short',
          year: '2-digit',
        });
      }),
      datasets: [{
        label: 'Monthly Income',
        data: stats.income_by_month.map(m => m.sum),
        borderColor: chartColors.incomeLine,
        backgroundColor: chartColors.incomeFill,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: chartColors.incomeLine,
        pointBorderColor: chartColors.tooltipBackground,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    };
  }, [stats, chartColors]);

  // Chart options - memoized and theme-aware
  const pieOptions = useMemo(() => ({
    ...getDefaultOptions,
    plugins: {
      ...getDefaultOptions.plugins,
      legend: {
        position: 'right' as const,
        labels: {
          ...getDefaultOptions.plugins.legend.labels,
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        ...getDefaultOptions.plugins.tooltip,
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            return `${context.label}: ${formatCurrency(context.parsed)}`;
          },
        },
      },
    },
    // Pie charts don't have scales, remove them
    scales: undefined,
  }), [getDefaultOptions]);

  const barOptions = useMemo(() => ({
    ...getDefaultOptions,
    plugins: {
      ...getDefaultOptions.plugins,
      legend: {
        display: false,
      },
      tooltip: {
        ...getDefaultOptions.plugins.tooltip,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      x: {
        ...getDefaultOptions.scales.x,
      },
      y: {
        ...getDefaultOptions.scales.y,
        beginAtZero: true,
        ticks: {
          ...getDefaultOptions.scales.y.ticks,
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }), [getDefaultOptions]);

  const lineOptions = useMemo(() => ({
    ...getDefaultOptions,
    plugins: {
      ...getDefaultOptions.plugins,
      legend: {
        display: false,
      },
      tooltip: {
        ...getDefaultOptions.plugins.tooltip,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      x: {
        ...getDefaultOptions.scales.x,
      },
      y: {
        ...getDefaultOptions.scales.y,
        beginAtZero: true,
        ticks: {
          ...getDefaultOptions.scales.y.ticks,
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }), [getDefaultOptions]);

  // Check if we have any data
  const hasData = stats && stats.total_count > 0;

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryPieData ? (
                  <div className="h-64">
                    <Pie data={categoryPieData} options={pieOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending by Bank Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spending by Bank</CardTitle>
              </CardHeader>
              <CardContent>
                {bankBarData ? (
                  <div className="h-64">
                    <Bar data={bankBarData} options={barOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No bank data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Spending and Income Over Time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Over Time Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spending Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {timeLineData ? (
                  <div className="h-64">
                    <Line data={timeLineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No spending data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Over Time Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Income Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeLineData ? (
                  <div className="h-64">
                    <Line data={incomeLineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No income data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Button variant="link" asChild className="p-0 h-auto">
                <Link to="/transactions">View all</Link>
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
                        No recent transactions
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
