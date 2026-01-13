import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../../src/pages/DashboardPage';
import * as apiClient from '../../src/api/client';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  api: {
    get: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    isNetworkError: boolean;
    constructor(message: string, status: number, isNetworkError = false) {
      super(message);
      this.status = status;
      this.isNetworkError = isNetworkError;
    }
  },
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
}));

function renderDashboard() {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
}

const mockStats = {
  total_amount: -50000,
  total_count: 100,
  by_category: [
    { name: 'Groceries', sum: -15000, count: 40 },
    { name: 'Transport', sum: -10000, count: 20 },
    { name: 'Uncategorized', sum: -25000, count: 40 },
  ],
  by_bank: [
    { name: 'CSOB', sum: -30000, count: 60 },
    { name: 'Raiffeisen', sum: -20000, count: 40 },
  ],
  by_month: [
    { month: '2024-04', sum: -15000, count: 30 },
    { month: '2024-05', sum: -20000, count: 40 },
    { month: '2024-06', sum: -15000, count: 30 },
  ],
};

const mockTransactions = {
  transactions: [
    {
      id: 1,
      date: '2024-06-15',
      description: 'Test transaction 1',
      amount: -500,
      bank: 'CSOB',
      category_id: 1,
      category_name: 'Groceries',
      category_color: '#22c55e',
    },
    {
      id: 2,
      date: '2024-06-14',
      description: 'Test transaction 2',
      amount: 1000,
      bank: 'Raiffeisen',
      category_id: null,
      category_name: null,
      category_color: null,
    },
  ],
  total: 100,
  limit: 10,
  offset: 0,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching data', () => {
    vi.mocked(apiClient.api.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderDashboard();

    // DashboardSkeleton renders multiple skeleton cards - check for the skeleton structure
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    vi.mocked(apiClient.api.get).mockRejectedValue(
      new apiClient.ApiRequestError('Failed to load data', 500)
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({ ...mockStats, total_count: 0, total_amount: 0 });
      }
      return Promise.resolve({ transactions: [], total: 0, limit: 10, offset: 0 });
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    expect(screen.getByText('Upload Statements')).toBeInTheDocument();
  });

  it('displays stats cards with formatted values', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total Spending')).toBeInTheDocument();
    });

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Largest Category')).toBeInTheDocument();
  });

  it('renders chart sections', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Spending by Category')).toBeInTheDocument();
    });

    expect(screen.getByText('Spending by Bank')).toBeInTheDocument();
    expect(screen.getByText('Spending Over Time')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders recent transactions table', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    expect(screen.getByText('Test transaction 1')).toBeInTheDocument();
    expect(screen.getByText('Test transaction 2')).toBeInTheDocument();
  });

  it('shows category name for categorized transactions', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      // Look for Groceries in the table (not the chart)
      expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Uncategorized" for transactions without category', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Uncategorized').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "View all" link to transactions', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('View all')).toBeInTheDocument();
    });

    expect(screen.getByText('View all').closest('a')).toHaveAttribute('href', '/transactions');
  });

  it('renders DateRangePicker', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve(mockTransactions);
    });

    renderDashboard();

    await waitFor(() => {
      // The date range picker should show something with dates
      const buttons = screen.getAllByRole('button');
      const dateButton = buttons.find(b => b.textContent?.includes('Last') || b.textContent?.includes('All'));
      expect(dateButton).toBeDefined();
    });
  });

  it('shows "No recent transactions" when empty', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve(mockStats);
      return Promise.resolve({ transactions: [], total: 100, limit: 10, offset: 0 });
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No recent transactions')).toBeInTheDocument();
    });
  });

});
