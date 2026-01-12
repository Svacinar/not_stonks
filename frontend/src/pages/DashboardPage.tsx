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
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
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

// Helper to get default date range (last 3 months)
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
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

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Bank colors
const BANK_COLORS: Record<BankName, string> = {
  CSOB: '#005BAC',
  Raiffeisen: '#FFD100',
  Revolut: '#0666EB',
};

export function DashboardPage() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state - default to last 3 months
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // Fetch stats and recent transactions
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

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
  }, [startDate, endDate]);

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

  // Pie chart data for spending by category
  const categoryPieData = useMemo(() => {
    if (!stats || stats.by_category.length === 0) return null;

    // Filter out positive sums (income) for expense pie chart
    const expenses = stats.by_category.filter(c => c.sum < 0);

    // Default colors for categories
    const defaultColors = [
      '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
      '#ef4444', '#06b6d4', '#64748b', '#9ca3af',
      '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    ];

    return {
      labels: expenses.map(c => c.name),
      datasets: [{
        data: expenses.map(c => Math.abs(c.sum)),
        backgroundColor: defaultColors.slice(0, expenses.length),
        borderWidth: 1,
      }],
    };
  }, [stats]);

  // Bar chart data for spending by bank
  const bankBarData = useMemo(() => {
    if (!stats || stats.by_bank.length === 0) return null;

    return {
      labels: stats.by_bank.map(b => b.name),
      datasets: [{
        label: 'Spending',
        data: stats.by_bank.map(b => Math.abs(b.sum)),
        backgroundColor: stats.by_bank.map(b => BANK_COLORS[b.name] || '#6b7280'),
        borderWidth: 1,
      }],
    };
  }, [stats]);

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
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      }],
    };
  }, [stats]);

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { label: string; parsed: number }) => {
            return `${context.label}: ${formatCurrency(context.parsed)}`;
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return formatCurrency(context.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  };

  // Handle date changes
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  // Check if we have any data
  const hasData = stats && stats.total_count > 0;

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
            From
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
            To
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Loading */}
      {loading && !error && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !hasData && (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No data available</h3>
          <p className="mt-2 text-sm text-gray-500">
            Upload some bank statements to see your spending dashboard.
          </p>
          <Link
            to="/upload"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upload Statements
          </Link>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && hasData && derivedStats && (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spending */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Spending</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(derivedStats.totalSpending)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Count */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {derivedStats.transactionCount.toLocaleString('cs-CZ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Transaction */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(derivedStats.averageTransaction)}
                  </p>
                </div>
              </div>
            </div>

            {/* Largest Category */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Largest Category</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(derivedStats.largestExpense)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Spending by Category</h2>
              {categoryPieData ? (
                <div className="h-64">
                  <Pie data={categoryPieData} options={pieOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No expense data available
                </div>
              )}
            </div>

            {/* Spending by Bank Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Spending by Bank</h2>
              {bankBarData ? (
                <div className="h-64">
                  <Bar data={bankBarData} options={barOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No bank data available
                </div>
              )}
            </div>
          </div>

          {/* Spending Over Time Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Spending Over Time</h2>
            {timeLineData ? (
              <div className="h-64">
                <Line data={timeLineData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No monthly data available
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
              <Link
                to="/transactions"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No recent transactions
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.amount < 0 ? '-' : ''}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {tx.category_name ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tx.category_color || '#9ca3af' }}
                              />
                              {tx.category_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Uncategorized</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
