import { useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDefaultDateRange, type DateRange } from '../utils/dateUtils';

const STORAGE_KEY = 'spending_dashboard_date_range';

/**
 * Hook that manages date range state via URL params with localStorage persistence.
 * This ensures date range is preserved when navigating between pages.
 */
export function useDateRangeParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // Initialize from localStorage or defaults if no URL params
  useEffect(() => {
    if (!searchParams.has('startDate') && !searchParams.has('endDate')) {
      // Try to load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      let range: DateRange;

      if (stored) {
        try {
          range = JSON.parse(stored);
        } catch {
          range = getDefaultDateRange();
        }
      } else {
        range = getDefaultDateRange();
      }

      const newParams = new URLSearchParams(searchParams);
      if (range.startDate) {
        newParams.set('startDate', range.startDate);
      }
      if (range.endDate) {
        newParams.set('endDate', range.endDate);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, []); // Only run on mount

  // Save to localStorage whenever URL params change
  useEffect(() => {
    if (startDate || endDate) {
      const range: DateRange = { startDate, endDate };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
    }
  }, [startDate, endDate]);

  // Derived date range for components
  const dateRange: DateRange = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate]
  );

  // Handler to update date range
  const setDateRange = useCallback(
    (range: DateRange) => {
      const newParams = new URLSearchParams(searchParams);

      if (range.startDate) {
        newParams.set('startDate', range.startDate);
      } else {
        newParams.delete('startDate');
      }

      if (range.endDate) {
        newParams.set('endDate', range.endDate);
      } else {
        newParams.delete('endDate');
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    dateRange,
    startDate,
    endDate,
    setDateRange,
    searchParams,
  };
}
