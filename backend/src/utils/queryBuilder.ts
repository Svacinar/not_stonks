/**
 * Shared query building utilities for transaction filters
 */

export interface TransactionFilterQuery {
  startDate?: string;
  endDate?: string;
  bank?: string;
  category?: string;
  uncategorized?: string;
  search?: string;
}

export interface WhereClauseResult {
  whereClause: string;
  params: (string | number)[];
}

/**
 * Build WHERE clause from transaction filter query parameters
 * Returns the SQL WHERE clause (including WHERE keyword if conditions exist)
 * and an array of parameter values for prepared statement binding
 *
 * @param query - Filter parameters from request query string
 * @returns Object containing whereClause string and params array
 */
export function buildTransactionWhereClause(query: TransactionFilterQuery): WhereClauseResult {
  const { startDate, endDate, bank, category, uncategorized, search } = query;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (startDate) {
    conditions.push('t.date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('t.date <= ?');
    params.push(endDate);
  }

  if (bank) {
    const banks = bank.split(',').map((b) => b.trim());
    conditions.push(`t.bank IN (${banks.map(() => '?').join(', ')})`);
    params.push(...banks);
  }

  if (category) {
    const categoryIds = category.split(',').map((c) => parseInt(c.trim(), 10));
    conditions.push(`t.category_id IN (${categoryIds.map(() => '?').join(', ')})`);
    params.push(...categoryIds);
  }

  if (uncategorized === 'true') {
    conditions.push('t.category_id IS NULL');
  }

  if (search) {
    conditions.push('t.description LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, params };
}
