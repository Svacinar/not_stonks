import { describe, it, expect } from 'vitest';
import { buildTransactionWhereClause, TransactionFilterQuery } from '../src/utils/queryBuilder';

describe('buildTransactionWhereClause', () => {
  // Note: All queries now always include t.is_hidden = 0 as the base condition

  it('should return is_hidden filter when no other filters provided', () => {
    const query: TransactionFilterQuery = {};
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0');
    expect(result.params).toEqual([]);
  });

  it('should handle startDate filter', () => {
    const query: TransactionFilterQuery = { startDate: '2024-01-01' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.date >= ?');
    expect(result.params).toEqual(['2024-01-01']);
  });

  it('should handle endDate filter', () => {
    const query: TransactionFilterQuery = { endDate: '2024-12-31' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.date <= ?');
    expect(result.params).toEqual(['2024-12-31']);
  });

  it('should handle date range filter', () => {
    const query: TransactionFilterQuery = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.date >= ? AND t.date <= ?');
    expect(result.params).toEqual(['2024-01-01', '2024-12-31']);
  });

  it('should handle single bank filter', () => {
    const query: TransactionFilterQuery = { bank: 'Chase' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.bank IN (?)');
    expect(result.params).toEqual(['Chase']);
  });

  it('should handle multiple banks filter', () => {
    const query: TransactionFilterQuery = { bank: 'Chase, Wells Fargo, Bank of America' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.bank IN (?, ?, ?)');
    expect(result.params).toEqual(['Chase', 'Wells Fargo', 'Bank of America']);
  });

  it('should handle single category filter', () => {
    const query: TransactionFilterQuery = { category: '1' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.category_id IN (?)');
    expect(result.params).toEqual([1]);
  });

  it('should handle multiple categories filter', () => {
    const query: TransactionFilterQuery = { category: '1, 2, 3' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.category_id IN (?, ?, ?)');
    expect(result.params).toEqual([1, 2, 3]);
  });

  it('should handle uncategorized filter', () => {
    const query: TransactionFilterQuery = { uncategorized: 'true' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.category_id IS NULL');
    expect(result.params).toEqual([]);
  });

  it('should ignore uncategorized when not "true"', () => {
    const query: TransactionFilterQuery = { uncategorized: 'false' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0');
    expect(result.params).toEqual([]);
  });

  it('should handle search filter', () => {
    const query: TransactionFilterQuery = { search: 'grocery' };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe('WHERE t.is_hidden = 0 AND t.description LIKE ?');
    expect(result.params).toEqual(['%grocery%']);
  });

  it('should handle all filters combined', () => {
    const query: TransactionFilterQuery = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      bank: 'Chase, Wells Fargo',
      category: '1, 2',
      search: 'store',
    };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe(
      'WHERE t.is_hidden = 0 AND t.date >= ? AND t.date <= ? AND t.bank IN (?, ?) AND t.category_id IN (?, ?) AND t.description LIKE ?'
    );
    expect(result.params).toEqual(['2024-01-01', '2024-12-31', 'Chase', 'Wells Fargo', 1, 2, '%store%']);
  });

  it('should handle empty string values as no additional filter', () => {
    const query: TransactionFilterQuery = {
      startDate: '',
      endDate: '',
      bank: '',
      category: '',
      search: '',
    };
    const result = buildTransactionWhereClause(query);

    // Empty strings are falsy, so only is_hidden condition should be present
    expect(result.whereClause).toBe('WHERE t.is_hidden = 0');
    expect(result.params).toEqual([]);
  });

  it('should trim whitespace from bank names', () => {
    const query: TransactionFilterQuery = { bank: '  Chase  ,  Wells Fargo  ' };
    const result = buildTransactionWhereClause(query);

    expect(result.params).toEqual(['Chase', 'Wells Fargo']);
  });

  it('should trim whitespace from category IDs', () => {
    const query: TransactionFilterQuery = { category: '  1  ,  2  ' };
    const result = buildTransactionWhereClause(query);

    expect(result.params).toEqual([1, 2]);
  });

  it('should handle uncategorized with other filters', () => {
    const query: TransactionFilterQuery = {
      startDate: '2024-01-01',
      uncategorized: 'true',
      search: 'coffee',
    };
    const result = buildTransactionWhereClause(query);

    expect(result.whereClause).toBe(
      'WHERE t.is_hidden = 0 AND t.date >= ? AND t.category_id IS NULL AND t.description LIKE ?'
    );
    expect(result.params).toEqual(['2024-01-01', '%coffee%']);
  });
});
