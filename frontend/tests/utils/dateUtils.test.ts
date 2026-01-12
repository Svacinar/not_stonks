import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDefaultDateRange,
  getDateRangeFromPreset,
  formatDateToISO,
  parseISODate,
  formatDateForDisplay,
  getPresetFromDateRange,
  getDateRangeLabel,
} from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    // Mock current date for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDateToISO', () => {
    it('formats a date to ISO string', () => {
      const date = new Date('2024-03-15T12:00:00.000Z');
      expect(formatDateToISO(date)).toBe('2024-03-15');
    });
  });

  describe('parseISODate', () => {
    it('parses a valid ISO date string', () => {
      const result = parseISODate('2024-03-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2); // March is 2 (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it('returns null for empty string', () => {
      expect(parseISODate('')).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(parseISODate('invalid')).toBeNull();
    });
  });

  describe('getDefaultDateRange', () => {
    it('returns a range spanning 3 months from today', () => {
      const range = getDefaultDateRange();
      expect(range.startDate).toBe('2024-03-15');
      expect(range.endDate).toBe('2024-06-15');
    });
  });

  describe('getDateRangeFromPreset', () => {
    it('returns correct range for last3months', () => {
      const range = getDateRangeFromPreset('last3months');
      expect(range.startDate).toBe('2024-03-15');
      expect(range.endDate).toBe('2024-06-15');
    });

    it('returns correct range for last6months', () => {
      const range = getDateRangeFromPreset('last6months');
      expect(range.startDate).toBe('2023-12-15');
      expect(range.endDate).toBe('2024-06-15');
    });

    it('returns correct range for thisYear', () => {
      const range = getDateRangeFromPreset('thisYear');
      expect(range.startDate).toBe('2024-01-01');
      expect(range.endDate).toBe('2024-06-15');
    });

    it('returns empty strings for allTime', () => {
      const range = getDateRangeFromPreset('allTime');
      expect(range.startDate).toBe('');
      expect(range.endDate).toBe('');
    });
  });

  describe('getPresetFromDateRange', () => {
    it('returns allTime for empty date range', () => {
      const preset = getPresetFromDateRange({ startDate: '', endDate: '' });
      expect(preset).toBe('allTime');
    });

    it('returns last3months for matching range', () => {
      const preset = getPresetFromDateRange({
        startDate: '2024-03-15',
        endDate: '2024-06-15',
      });
      expect(preset).toBe('last3months');
    });

    it('returns null for custom range', () => {
      const preset = getPresetFromDateRange({
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });
      expect(preset).toBeNull();
    });
  });

  describe('getDateRangeLabel', () => {
    it('returns "All time" for empty range', () => {
      const label = getDateRangeLabel({ startDate: '', endDate: '' });
      expect(label).toBe('All time');
    });

    it('returns preset label for matching preset', () => {
      const label = getDateRangeLabel({
        startDate: '2024-03-15',
        endDate: '2024-06-15',
      });
      expect(label).toBe('Last 3 months');
    });

    it('returns formatted date range for custom range', () => {
      const label = getDateRangeLabel({
        startDate: '2024-01-15',
        endDate: '2024-03-20',
      });
      // The exact format depends on locale, but should contain both dates
      expect(label).toContain('15');
      expect(label).toContain('20');
    });

    it('returns "From" label when only start date', () => {
      const label = getDateRangeLabel({
        startDate: '2024-01-15',
        endDate: '',
      });
      expect(label).toContain('From');
    });

    it('returns "Until" label when only end date', () => {
      const label = getDateRangeLabel({
        startDate: '',
        endDate: '2024-03-20',
      });
      expect(label).toContain('Until');
    });
  });

  describe('formatDateForDisplay', () => {
    it('formats a date for display', () => {
      const formatted = formatDateForDisplay('2024-03-15');
      // Should include day, month, and year
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('returns empty string for empty input', () => {
      expect(formatDateForDisplay('')).toBe('');
    });
  });
});
