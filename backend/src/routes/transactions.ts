import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import type { Transaction, TransactionStats, BankName } from 'shared/types';
import { buildTransactionWhereClause } from '../utils/queryBuilder';
import { createErrorResponse, ErrorCodes } from '../middleware/errorHandler';
import { validateIdParam } from '../middleware/validation';

const router = Router();

interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

interface TransactionListQuery {
  startDate?: string;
  endDate?: string;
  bank?: string;
  category?: string;
  uncategorized?: string;
  search?: string;
  limit?: string;
  offset?: string;
  sort?: string;
  order?: string;
}

/**
 * GET /api/transactions
 * List transactions with filters
 */
router.get('/', (req: Request<{}, {}, {}, TransactionListQuery>, res: Response): void => {
  try {
    const db = getDatabase();
    const {
      startDate,
      endDate,
      bank,
      category,
      uncategorized,
      search,
      limit = '50',
      offset = '0',
      sort = 'date',
      order = 'desc',
    } = req.query;

    // Build WHERE conditions using shared utility
    const { whereClause, params } = buildTransactionWhereClause({
      startDate,
      endDate,
      bank,
      category,
      uncategorized,
      search,
    });

    // Validate sort column
    const allowedSortColumns = ['date', 'amount', 'description', 'bank', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'date';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };

    // Get transactions with category info
    const dataQuery = `
      SELECT
        t.id,
        t.date,
        t.amount,
        t.description,
        t.bank,
        t.category_id,
        t.created_at,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 500);
    const offsetNum = parseInt(offset, 10) || 0;

    const transactions = db
      .prepare(dataQuery)
      .all(...params, limitNum, offsetNum) as TransactionWithCategory[];

    res.json({
      transactions,
      total: countResult.total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * GET /api/transactions/stats
 * Get aggregate statistics
 */
router.get('/stats', (req: Request<{}, {}, {}, TransactionListQuery>, res: Response): void => {
  try {
    const db = getDatabase();
    const { startDate, endDate, bank, category } = req.query;

    // Build WHERE conditions using shared utility
    const { whereClause, params } = buildTransactionWhereClause({
      startDate,
      endDate,
      bank,
      category,
    });

    // Total count and amount
    const totalsQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions t
      ${whereClause}
    `;
    const totals = db.prepare(totalsQuery).get(...params) as {
      total_count: number;
      total_amount: number;
    };

    // By category - treat uncategorized income as "Income", uncategorized expenses as "Uncategorized"
    const byCategoryQuery = `
      SELECT
        CASE
          WHEN t.category_id IS NULL AND t.amount > 0 THEN 'Income'
          ELSE COALESCE(c.name, 'Uncategorized')
        END as name,
        COUNT(*) as count,
        SUM(t.amount) as sum
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY
        CASE
          WHEN t.category_id IS NULL AND t.amount > 0 THEN 'Income'
          ELSE COALESCE(c.name, 'Uncategorized')
        END
      ORDER BY sum ASC
    `;
    const byCategory = db.prepare(byCategoryQuery).all(...params) as {
      name: string;
      count: number;
      sum: number;
    }[];

    // By bank
    const byBankQuery = `
      SELECT
        t.bank as name,
        COUNT(*) as count,
        SUM(t.amount) as sum
      FROM transactions t
      ${whereClause}
      GROUP BY t.bank
      ORDER BY sum ASC
    `;
    const byBank = db.prepare(byBankQuery).all(...params) as {
      name: BankName;
      count: number;
      sum: number;
    }[];

    // By month (expenses - negative amounts)
    const byMonthQuery = `
      SELECT
        strftime('%Y-%m', t.date) as month,
        SUM(CASE WHEN t.amount < 0 THEN 1 ELSE 0 END) as count,
        SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END) as sum
      FROM transactions t
      ${whereClause}
      GROUP BY strftime('%Y-%m', t.date)
      HAVING SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END) < 0
      ORDER BY month ASC
    `;
    const byMonth = db.prepare(byMonthQuery).all(...params) as {
      month: string;
      count: number;
      sum: number;
    }[];

    // Income by month (positive amounts)
    const incomeByMonthQuery = `
      SELECT
        strftime('%Y-%m', t.date) as month,
        SUM(CASE WHEN t.amount > 0 THEN 1 ELSE 0 END) as count,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as sum
      FROM transactions t
      ${whereClause}
      GROUP BY strftime('%Y-%m', t.date)
      HAVING SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) > 0
      ORDER BY month ASC
    `;
    const incomeByMonth = db.prepare(incomeByMonthQuery).all(...params) as {
      month: string;
      count: number;
      sum: number;
    }[];

    // Date range
    const dateRangeQuery = `
      SELECT
        MIN(t.date) as min,
        MAX(t.date) as max
      FROM transactions t
      ${whereClause}
    `;
    const dateRange = db.prepare(dateRangeQuery).get(...params) as {
      min: string | null;
      max: string | null;
    };

    const stats: TransactionStats = {
      total_count: totals.total_count,
      total_amount: totals.total_amount,
      by_category: byCategory,
      by_bank: byBank,
      by_month: byMonth,
      income_by_month: incomeByMonth,
      date_range: {
        min: dateRange.min || '',
        max: dateRange.max || '',
      },
    };

    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * GET /api/transactions/:id
 * Get a single transaction
 */
router.get('/:id', validateIdParam, (req: Request<{ id: string }>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const query = `
      SELECT
        t.id,
        t.date,
        t.amount,
        t.description,
        t.bank,
        t.category_id,
        t.created_at,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `;

    const transaction = db.prepare(query).get(id) as TransactionWithCategory | undefined;

    if (!transaction) {
      res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Transaction not found'));
      return;
    }

    res.json(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * PATCH /api/transactions/:id
 * Update a transaction's category (auto-creates rule from description)
 */
router.patch(
  '/:id',
  validateIdParam,
  (req: Request<{ id: string }, {}, { category_id: number | null }>, res: Response): void => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const { category_id } = req.body;

      // Check transaction exists
      const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as
        | Transaction
        | undefined;

      if (!existing) {
        res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Transaction not found'));
        return;
      }

      // Validate category_id if provided
      if (category_id !== null && category_id !== undefined) {
        const categoryExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
        if (!categoryExists) {
          res.status(400).json(createErrorResponse(ErrorCodes.BAD_REQUEST, 'Invalid category_id'));
          return;
        }
      }

      // Update transaction
      db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(category_id, id);

      // Auto-create rule from description keyword when category is set
      if (category_id !== null && category_id !== undefined) {
        const keyword = extractKeyword(existing.description);
        if (keyword) {
          // Check if rule already exists
          const existingRule = db
            .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
            .get(keyword);

          if (!existingRule) {
            db.prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)').run(
              keyword,
              category_id
            );
          }
        }
      }

      // Return updated transaction
      const updated = db
        .prepare(
          `
        SELECT
          t.id,
          t.date,
          t.amount,
          t.description,
          t.bank,
          t.category_id,
          t.created_at,
          c.name as category_name,
          c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `
        )
        .get(id) as TransactionWithCategory;

      res.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
    }
  }
);

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', validateIdParam, (req: Request<{ id: string }>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    if (result.changes === 0) {
      res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Transaction not found'));
      return;
    }

    res.json({ success: true, deleted: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * Extract a significant keyword from a transaction description
 * Skips common words like "payment", "transfer", etc.
 */
function extractKeyword(description: string): string | null {
  const stopWords = [
    'payment',
    'transfer',
    'card',
    'debit',
    'credit',
    'pos',
    'atm',
    'fee',
    'charge',
    'transaction',
    'from',
    'to',
    'the',
    'a',
    'an',
    'and',
    'or',
    'for',
    'of',
    'in',
    'on',
    'at',
    'with',
  ];

  // Clean and split description
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  // Return first significant word
  return words.length > 0 ? words[0] : null;
}

export default router;
