import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RulesPage } from '../../src/pages/RulesPage';
import * as apiClient from '../../src/api/client';
import {
  standardRulesResponse,
  standardCategoriesResponse,
  standardUncategorizedResponse,
} from '../fixtures';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

function renderRulesPage() {
  return render(
    <BrowserRouter>
      <RulesPage />
    </BrowserRouter>
  );
}

// Use fixtures for mock data
const mockRules = standardRulesResponse;
const mockCategories = standardCategoriesResponse;
const mockUncategorized = standardUncategorizedResponse;

describe('RulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    expect(screen.getByText('Categorization Rules')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching data', () => {
    vi.mocked(apiClient.api.get).mockImplementation(
      () => new Promise(() => {})
    );

    renderRulesPage();

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    vi.mocked(apiClient.api.get).mockRejectedValue(
      new apiClient.ApiRequestError('Failed to load data', 500)
    );

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('displays uncategorized count', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    expect(screen.getByText(/uncategorized transactions?/i)).toBeInTheDocument();
  });

  it('displays rules in table', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument();
    });

    expect(screen.getByText('UBER')).toBeInTheDocument();
    // Categories appear both in the form dropdown and in table - check table rows
    const tableRows = screen.getAllByRole('row');
    expect(tableRows.length).toBeGreaterThan(1); // header + data rows
    expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transport').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no rules', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce({ rules: [] })
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText(/No rules defined yet/i)).toBeInTheDocument();
    });
  });

  it('renders add rule form', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('Add New Rule')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Keyword')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByText('Add Rule')).toBeInTheDocument();
  });

  it('adds new rule', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    vi.mocked(apiClient.api.post).mockResolvedValueOnce({
      id: 3,
      keyword: 'NETFLIX',
      category_id: 1,
      category_name: 'Groceries',
      created_at: '2024-06-15T00:00:00Z',
    });

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Keyword')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Keyword'), {
      target: { value: 'NETFLIX' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByText('Add Rule'));

    await waitFor(() => {
      expect(apiClient.api.post).toHaveBeenCalledWith('/api/rules', {
        keyword: 'NETFLIX',
        category_id: 1,
      });
    });
  });

  it('edits existing rule', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    vi.mocked(apiClient.api.patch).mockResolvedValueOnce({
      id: 1,
      keyword: 'TESCO STORES',
      category_id: 2,
      category_name: 'Transport',
      created_at: '2024-01-01T00:00:00Z',
    });

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument();
    });

    // Click edit button (first one in actions)
    const editButtons = screen.getAllByTitle('Edit rule');
    fireEvent.click(editButtons[0]);

    // Change keyword
    const keywordInput = screen.getByDisplayValue('TESCO');
    fireEvent.change(keywordInput, { target: { value: 'TESCO STORES' } });

    // Save
    const saveButtons = screen.getAllByRole('button');
    const saveButton = saveButtons.find(btn =>
      btn.querySelector('path[d="M5 13l4 4L19 7"]')
    );
    fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(apiClient.api.patch).toHaveBeenCalled();
    });
  });

  it('cancels editing', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByTitle('Edit rule');
    fireEvent.click(editButtons[0]);

    // Should show input
    expect(screen.getByDisplayValue('TESCO')).toBeInTheDocument();

    // Cancel
    const cancelButtons = screen.getAllByRole('button');
    const cancelButton = cancelButtons.find(btn =>
      btn.querySelector('path[d="M6 18L18 6M6 6l12 12"]')
    );
    fireEvent.click(cancelButton!);

    // Should no longer be in edit mode
    expect(screen.queryByDisplayValue('TESCO')).not.toBeInTheDocument();
    expect(screen.getByText('TESCO')).toBeInTheDocument();
  });

  it('deletes rule with confirmation', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    vi.mocked(apiClient.api.delete).mockResolvedValueOnce(undefined);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete rule');
    fireEvent.click(deleteButtons[0]);

    // Should show AlertDialog with title
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Delete Rule')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete the rule for keyword "TESCO"\?/)).toBeInTheDocument();

    // Confirm delete
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(apiClient.api.delete).toHaveBeenCalledWith('/api/rules/1');
    });
  });

  it('cancels delete confirmation', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete rule');
    fireEvent.click(deleteButtons[0]);

    // Should show AlertDialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // AlertDialog should be gone
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('applies rules to uncategorized transactions', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized)
      .mockResolvedValueOnce({ transactions: [], total: 10 }); // After apply

    vi.mocked(apiClient.api.post).mockResolvedValueOnce({
      success: true,
      categorized: 15,
      total_uncategorized: 25,
    });

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('Apply Rules')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply Rules'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    expect(screen.getByText(/Categorized/)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('disables Apply Rules button when no rules', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce({ rules: [] })
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Rules');
      expect(applyButton).toBeDisabled();
    });
  });

  it('disables Apply Rules button when no uncategorized transactions', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce({ transactions: [], total: 0 });

    renderRulesPage();

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Rules');
      expect(applyButton).toBeDisabled();
    });
  });

  it('shows rules count', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized);

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    expect(screen.getByText(/rules? defined/i)).toBeInTheDocument();
  });

  it('dismisses apply result notification', async () => {
    vi.mocked(apiClient.api.get)
      .mockResolvedValueOnce(mockRules)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockUncategorized)
      .mockResolvedValueOnce({ transactions: [], total: 10 });

    vi.mocked(apiClient.api.post).mockResolvedValueOnce({
      success: true,
      categorized: 15,
      total_uncategorized: 25,
    });

    renderRulesPage();

    await waitFor(() => {
      expect(screen.getByText('Apply Rules')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply Rules'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    // Dismiss the notification
    const dismissButton = screen.getByRole('status').querySelector('button');
    fireEvent.click(dismissButton!);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
