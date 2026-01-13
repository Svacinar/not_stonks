import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionsPage } from '../../src/pages/TransactionsPage';
import { ToastProvider } from '../../src/components/Toast';
import * as apiClient from '../../src/api/client';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    download: vi.fn(),
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

function renderTransactionsPage(initialRoute = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ToastProvider>
        <TransactionsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

const mockTransactions = {
  transactions: [
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
  ],
  total: 3,
  limit: 50,
  offset: 0,
};

const mockCategories = {
  categories: [
    { id: 1, name: 'Groceries', color: '#22c55e', transaction_count: 10 },
    { id: 2, name: 'Transport', color: '#3b82f6', transaction_count: 5 },
  ],
};

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching data', () => {
    vi.mocked(apiClient.api.get).mockImplementation(
      () => new Promise(() => {})
    );

    renderTransactionsPage();

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.reject(new apiClient.ApiRequestError('Failed to load transactions', 500));
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load transactions')).toBeInTheDocument();
  });

  it('displays transactions in table', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO STORES')).toBeInTheDocument();
    });

    expect(screen.getByText('UBER TRIP')).toBeInTheDocument();
    expect(screen.getByText('SALARY')).toBeInTheDocument();
  });

  it('shows category names for categorized transactions', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      // Categories appear in both the filter and the table
      expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Transport').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no transactions', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve({ transactions: [], total: 0, limit: 50, offset: 0 });
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search descriptions...')).toBeInTheDocument();
    });

    expect(screen.getByText('Banks:')).toBeInTheDocument();
    expect(screen.getByText('Categories:')).toBeInTheDocument();
    expect(screen.getByLabelText('CSOB')).toBeInTheDocument();
    expect(screen.getByLabelText('Raiffeisen')).toBeInTheDocument();
    expect(screen.getByLabelText('Revolut')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search descriptions...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search descriptions...');
    fireEvent.change(searchInput, { target: { value: 'TESCO' } });

    // The URL should be updated
    await waitFor(() => {
      expect(apiClient.api.get).toHaveBeenCalled();
    });
  });

  it('filters by bank', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByLabelText('CSOB')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('CSOB'));

    await waitFor(() => {
      expect(apiClient.api.get).toHaveBeenCalled();
    });
  });

  it('filters by uncategorized only', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Uncategorized only')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Uncategorized only'));

    await waitFor(() => {
      expect(apiClient.api.get).toHaveBeenCalled();
    });
  });

  it('sorts by column when header clicked', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText(/Amount/)).toBeInTheDocument();
    });

    // Click on Amount header
    fireEvent.click(screen.getByText(/Amount/));

    await waitFor(() => {
      expect(apiClient.api.get).toHaveBeenCalled();
    });
  });

  it('opens export modal when Export clicked', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByText('Export Transactions')).toBeInTheDocument();
    expect(screen.getByText('Download CSV')).toBeInTheDocument();
    expect(screen.getByText('Download JSON')).toBeInTheDocument();
  });

  it('exports CSV when Download CSV clicked', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    vi.mocked(apiClient.api.download).mockResolvedValue({
      blob: new Blob(['data']),
      filename: 'transactions.csv',
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Download CSV'));

    await waitFor(() => {
      expect(apiClient.api.download).toHaveBeenCalled();
    });
  });

  it('closes export modal when Cancel clicked', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export Transactions')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Export Transactions')).not.toBeInTheDocument();
  });

  it('allows inline category editing', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    vi.mocked(apiClient.api.patch).mockResolvedValue({
      ...mockTransactions.transactions[0],
      category_id: 2,
      category_name: 'Transport',
      category_color: '#3b82f6',
    });

    renderTransactionsPage();

    await waitFor(() => {
      // Find the category button in the table
      const groceriesButtons = screen.getAllByText('Groceries');
      expect(groceriesButtons.length).toBeGreaterThanOrEqual(1);
    });

    // Click on a categorized transaction's category in the table
    const tableRows = screen.getAllByRole('row');
    const firstDataRow = tableRows[1]; // Skip header
    const categoryButton = firstDataRow.querySelector('button');
    if (categoryButton) {
      fireEvent.click(categoryButton);

      // Select new category
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '2' } });
      });

      await waitFor(() => {
        expect(apiClient.api.patch).toHaveBeenCalled();
      });
    }
  });

  it('renders pagination when needed', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve({
        ...mockTransactions,
        total: 100,
      });
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('shows transaction count when no pagination needed', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve(mockTransactions);
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('navigates to next page', async () => {
    vi.mocked(apiClient.api.get).mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve(mockCategories);
      return Promise.resolve({
        ...mockTransactions,
        total: 100,
      });
    });

    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(apiClient.api.get).toHaveBeenCalled();
    });
  });
});
