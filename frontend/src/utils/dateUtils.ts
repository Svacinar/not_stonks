/**
 * Centralized date utilities for the spending dashboard.
 * Provides consistent date handling across all pages.
 */

export interface DateRange {
  startDate: string; // ISO format: YYYY-MM-DD
  endDate: string; // ISO format: YYYY-MM-DD
}

export type DatePreset = 'last3months' | 'last6months' | 'thisYear' | 'allTime';

/**
 * Returns the default date range (last 3 months).
 * Used as the standard default across Dashboard and Transactions pages.
 */
export function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);

  return {
    startDate: formatDateToISO(start),
    endDate: formatDateToISO(end),
  };
}

/**
 * Returns a date range for a given preset.
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'last3months':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'last6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'thisYear':
      start.setMonth(0);
      start.setDate(1);
      break;
    case 'allTime':
      // Return empty strings to indicate no date filter
      return { startDate: '', endDate: '' };
  }

  return {
    startDate: formatDateToISO(start),
    endDate: formatDateToISO(end),
  };
}

/**
 * Formats a Date object to ISO date string (YYYY-MM-DD).
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses an ISO date string to a Date object.
 * Returns null if the string is empty or invalid.
 */
export function parseISODate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a date string for display (localized).
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = parseISODate(dateStr);
  if (!date) return '';

  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Determines which preset (if any) matches the given date range.
 * Returns null if no preset matches.
 */
export function getPresetFromDateRange(range: DateRange): DatePreset | null {
  if (!range.startDate && !range.endDate) {
    return 'allTime';
  }

  const presets: DatePreset[] = ['last3months', 'last6months', 'thisYear'];

  for (const preset of presets) {
    const presetRange = getDateRangeFromPreset(preset);
    if (
      presetRange.startDate === range.startDate &&
      presetRange.endDate === range.endDate
    ) {
      return preset;
    }
  }

  return null;
}

/**
 * Returns a human-readable label for the date range.
 */
export function getDateRangeLabel(range: DateRange): string {
  if (!range.startDate && !range.endDate) {
    return 'All time';
  }

  const preset = getPresetFromDateRange(range);
  if (preset) {
    switch (preset) {
      case 'last3months':
        return 'Last 3 months';
      case 'last6months':
        return 'Last 6 months';
      case 'thisYear':
        return 'This year';
      case 'allTime':
        return 'All time';
    }
  }

  // Custom range
  const start = formatDateForDisplay(range.startDate);
  const end = formatDateForDisplay(range.endDate);

  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return `From ${start}`;
  } else if (end) {
    return `Until ${end}`;
  }

  return 'Custom range';
}
