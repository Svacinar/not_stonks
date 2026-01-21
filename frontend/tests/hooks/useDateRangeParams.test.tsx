import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useDateRangeParams } from '../../src/hooks/useDateRangeParams';

const STORAGE_KEY = 'spending_dashboard_date_range';

describe('useDateRangeParams', () => {
  // Use the global localStorage mock from setup.ts
  const mockGetItem = vi.mocked(localStorage.getItem);
  const mockSetItem = vi.mocked(localStorage.setItem);

  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    // Default: no stored data
    mockGetItem.mockReturnValue(null);
  });

  function createWrapper(initialEntries: string[] = ['/']) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      );
    };
  }

  it('initializes with default date range when no URL params and no localStorage', async () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/'])
    });

    // Wait for initialization effect to run
    await waitFor(() => {
      expect(result.current.startDate).toBeTruthy();
      expect(result.current.endDate).toBeTruthy();
    });
  });

  it('restores date range from localStorage when no URL params', async () => {
    // Mock localStorage to return stored date range
    const storedRange = { startDate: '2024-01-01', endDate: '2024-03-31' };
    mockGetItem.mockReturnValue(JSON.stringify(storedRange));

    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/'])
    });

    // Wait for initialization to restore from localStorage
    await waitFor(() => {
      expect(result.current.startDate).toBe('2024-01-01');
      expect(result.current.endDate).toBe('2024-03-31');
    });
  });

  it('uses URL params when they exist', () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-06-01&endDate=2024-06-30'])
    });

    // URL params should be used directly (no waiting needed)
    expect(result.current.startDate).toBe('2024-06-01');
    expect(result.current.endDate).toBe('2024-06-30');
  });

  it('prefers URL params over localStorage', () => {
    // Mock localStorage with different dates
    const storedRange = { startDate: '2024-01-01', endDate: '2024-03-31' };
    mockGetItem.mockReturnValue(JSON.stringify(storedRange));

    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-06-01&endDate=2024-06-30'])
    });

    // URL params should take precedence
    expect(result.current.startDate).toBe('2024-06-01');
    expect(result.current.endDate).toBe('2024-06-30');
  });

  it('saves to localStorage when initialized with URL params', async () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-05-01&endDate=2024-05-31'])
    });

    // Wait for the effect to run
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ startDate: '2024-05-01', endDate: '2024-05-31' })
      );
    });
  });

  it('updates URL when setDateRange is called', async () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-01-01&endDate=2024-01-31'])
    });

    expect(result.current.startDate).toBe('2024-01-01');

    // Update the date range
    act(() => {
      result.current.setDateRange({ startDate: '2024-07-01', endDate: '2024-07-31' });
    });

    // State should update
    await waitFor(() => {
      expect(result.current.startDate).toBe('2024-07-01');
      expect(result.current.endDate).toBe('2024-07-31');
    });
  });

  it('handles corrupted localStorage gracefully', async () => {
    // Return invalid JSON
    mockGetItem.mockReturnValue('not valid json');

    // Should not throw
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/'])
    });

    // Should fall back to defaults without crashing
    await waitFor(() => {
      expect(result.current.startDate).toBeTruthy();
      expect(result.current.endDate).toBeTruthy();
    });
  });

  it('returns searchParams for building links', () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-05-01&endDate=2024-05-31'])
    });

    expect(result.current.searchParams).toBeDefined();
    expect(result.current.searchParams.get('startDate')).toBe('2024-05-01');
  });

  it('provides dateRange object with both dates', () => {
    const { result } = renderHook(() => useDateRangeParams(), {
      wrapper: createWrapper(['/?startDate=2024-05-01&endDate=2024-05-31'])
    });

    expect(result.current.dateRange).toEqual({
      startDate: '2024-05-01',
      endDate: '2024-05-31'
    });
  });
});
