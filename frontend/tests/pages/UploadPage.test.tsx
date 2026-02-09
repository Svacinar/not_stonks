import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UploadPage } from '../../src/pages/UploadPage';
import * as apiClient from '../../src/api/client';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  api: {
    parseFiles: vi.fn(),
    completeImport: vi.fn(),
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

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderUploadPage() {
  return render(
    <BrowserRouter>
      <UploadPage />
    </BrowserRouter>
  );
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page title', () => {
    renderUploadPage();
    expect(screen.getByText('Upload Bank Statements')).toBeInTheDocument();
  });

  it('renders drag and drop zone', () => {
    renderUploadPage();
    expect(screen.getByText(/Drag and drop your bank statements here/i)).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('shows supported file formats', () => {
    renderUploadPage();
    expect(screen.getByText(/Supported formats: CSV, TXT, XLSX, XLS/i)).toBeInTheDocument();
  });

  it('adds files when selected via file input', async () => {
    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);

    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
  });

  it('shows file size', async () => {
    renderUploadPage();

    const content = 'x'.repeat(1024);
    const file = new File([content], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);

    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('validates file type', async () => {
    renderUploadPage();

    const file = new File(['content'], 'test.exe', { type: 'application/exe' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);

    expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
  });

  it('validates file size', async () => {
    renderUploadPage();

    const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);

    expect(screen.getByText(/File too large/i)).toBeInTheDocument();
  });

  it('removes file when remove button is clicked', async () => {
    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);
    expect(screen.getByText('test.csv')).toBeInTheDocument();

    const removeButton = screen.getByLabelText('Remove test.csv');
    fireEvent.click(removeButton);

    expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
  });

  it('clears all files when clear all is clicked', async () => {
    renderUploadPage();

    const file1 = new File(['content1'], 'file1.csv', { type: 'text/csv' });
    const file2 = new File(['content2'], 'file2.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file1, file2],
    });

    fireEvent.change(input);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
    expect(screen.getByText('file2.csv')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear all'));

    expect(screen.queryByText('file1.csv')).not.toBeInTheDocument();
    expect(screen.queryByText('file2.csv')).not.toBeInTheDocument();
  });

  it('uploads files and shows success message', async () => {
    vi.mocked(apiClient.api.parseFiles).mockResolvedValueOnce({
      sessionId: 'test-session',
      currencies: ['CZK'],
      byCurrency: {},
    });
    vi.mocked(apiClient.api.completeImport).mockResolvedValueOnce({
      imported: 100,
      duplicates: 5,
      byBank: { CSOB: 50, Raiffeisen: 50, Revolut: 0 },
    });

    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText('Upload 1 file'));

    await waitFor(() => {
      expect(screen.getByText('Upload Successful')).toBeInTheDocument();
    });

    expect(screen.getByText(/Imported 100 transactions/)).toBeInTheDocument();
    expect(screen.getByText(/5 duplicates? skipped/)).toBeInTheDocument();
  });

  it('shows error message on upload failure', async () => {
    vi.mocked(apiClient.api.parseFiles).mockRejectedValueOnce(
      new apiClient.ApiRequestError('Upload failed', 500)
    );

    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText('Upload 1 file'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('navigates to transactions after successful upload', async () => {
    vi.mocked(apiClient.api.parseFiles).mockResolvedValueOnce({
      sessionId: 'test-session',
      currencies: ['CZK'],
      byCurrency: {},
    });
    vi.mocked(apiClient.api.completeImport).mockResolvedValueOnce({
      imported: 100,
      duplicates: 0,
      byBank: { CSOB: 100, Raiffeisen: 0, Revolut: 0 },
    });

    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText('Upload 1 file'));

    await waitFor(() => {
      expect(screen.getByText('View Transactions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Transactions'));
    expect(mockNavigate).toHaveBeenCalledWith('/transactions');
  });

  it('allows uploading more files after success', async () => {
    vi.mocked(apiClient.api.parseFiles).mockResolvedValueOnce({
      sessionId: 'test-session',
      currencies: ['CZK'],
      byCurrency: {},
    });
    vi.mocked(apiClient.api.completeImport).mockResolvedValueOnce({
      imported: 100,
      duplicates: 0,
      byBank: { CSOB: 100, Raiffeisen: 0, Revolut: 0 },
    });

    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);
    fireEvent.click(screen.getByText('Upload 1 file'));

    await waitFor(() => {
      expect(screen.getByText('Upload More')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Upload More'));
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('handles drag and drop', async () => {
    renderUploadPage();

    const dropZone = screen.getByText(/Drag and drop your bank statements here/i).parentElement?.parentElement;

    const file = new File(['content'], 'dragged.csv', { type: 'text/csv' });
    const dataTransfer = {
      files: [file],
    };

    fireEvent.dragOver(dropZone!, { dataTransfer });
    fireEvent.drop(dropZone!, { dataTransfer });

    expect(screen.getByText('dragged.csv')).toBeInTheDocument();
  });

  it('prevents duplicate files', async () => {
    renderUploadPage();

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    // Add file first time
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(input);

    // Try to add same file again
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(input);

    // Should only have one file
    expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
  });

  it('enforces max file limit', async () => {
    renderUploadPage();

    const files = Array.from({ length: 11 }, (_, i) =>
      new File(['content'], `file${i}.csv`, { type: 'text/csv' })
    );

    const input = screen.getByTestId('file-input');

    Object.defineProperty(input, 'files', {
      value: files,
    });

    fireEvent.change(input);

    expect(screen.getByText(/Too many files/i)).toBeInTheDocument();
  });
});
