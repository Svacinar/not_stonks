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
import { ErrorMessage, DateRangePicker } from '../components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { BANK_COLORS, CHART_COLORS_HEX } from '@/constants/colors';
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

    const totalSpending = Math.abs(stats.total_amount);
    const transactionCount = stats.total_count;
    const averageTransaction = transactionCount > 0 ? totalSpending / transactionCount : 0;

    // Find largest expense (most negative amount in original transactions list)
    let largestExpense = 0;
    if (recentTransactions.length > 0) {
      // Note: We need to get this from transactions list, not stats
      // For now, calculate from by_category which has the sums
      // We'll use the largest single category sum as proxy
      const categoryAmounts = stats.by_category.map(c => Math.abs(c.sum));
      largestExpense = categoryAmounts.length > 0 ? Math.max(...categoryAmounts) : 0;
    }

    return {
      totalSpending,
      transactionCount,
      averageTransaction,
      largestExpense,
    };
  }, [stats, recentTransactions]);

  // Theme-aware chart options
  const { colors: chartColors, getDefaultOptions } = useChartTheme();

  // Pie chart data for spending by category
  const categoryPieData = useMemo(() => {
    if (!stats || stats.by_category.length === 0) return null;

    // Filter out positive sums (income) for expense pie chart
    const expenses = stats.by_category.filter(c => c.sum < 0);

    // Return null if no expenses to show
    if (expenses.length === 0) return null;

    // Gray color for uncategorized items
    const uncategorizedColor = '#6b7280';

    // Assign colors: gray for Uncategorized, chart colors for others
    let colorIndex = 0;
    const colors = expenses.map(c => {
      if (c.name === 'Uncategorized') {
        return uncategorizedColor;
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
        backgroundColor: stats.by_bank.map(b => BANK_COLORS[b.name as BankName] || '#6b7280'),
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
        borderColor: CHART_COLORS_HEX[1], // blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: CHART_COLORS_HEX[1],
        pointBorderColor: chartColors.tooltipBackground,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    };
  }, [stats, chartColors.tooltipBackground]);

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
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

        {/* Date Range Selector */}
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Loading */}
      {loading && !error && <DashboardSkeleton />}

      {/* Empty State */}
      {!loading && !error && !hasData && (
        <Card className="text-center py-16">
          <CardContent className="pt-6">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">No data available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload some bank statements to see your spending dashboard.
            </p>
            <Button asChild className="mt-4">
              <Link to="/upload">Upload Statements</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!loading && !error && hasData && derivedStats && (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spending */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(derivedStats.totalSpending)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Count */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {derivedStats.transactionCount.toLocaleString('cs-CZ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Transaction */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Average</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(derivedStats.averageTransaction)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Largest Category */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Largest Category</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(derivedStats.largestExpense)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  No monthly data available
                </div>
              )}
            </CardContent>
          </Card>

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
                          tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {tx.amount < 0 ? '-' : ''}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {tx.category_name ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tx.category_color || '#9ca3af' }}
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
