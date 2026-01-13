import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import type { Transaction, BankName } from 'shared/types';
import { buildTransactionWhereClause } from '../utils/queryBuilder';
import { createErrorResponse, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

interface ExportQuery {
  startDate?: string;
  endDate?: string;
  bank?: string;
  category?: string;
  uncategorized?: string;
  search?: string;
  format?: string;
}

/**
 * Escape a value for CSV format
 * Handles commas, quotes, and newlines
 */
function escapeCsvValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * GET /api/export/transactions
 * Export transactions with filters
 * Supports CSV and JSON formats
 */
router.get('/transactions', (req: Request<{}, {}, {}, ExportQuery>, res: Response): void => {
  try {
    const db = getDatabase();
    const { format = 'csv' } = req.query;

    // Validate format
    if (format !== 'csv' && format !== 'json') {
      res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid format. Use "csv" or "json"'));
      return;
    }

    const { whereClause, params } = buildTransactionWhereClause(req.query);

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
      ORDER BY t.date DESC
    `;

    const transactions = db.prepare(dataQuery).all(...params) as TransactionWithCategory[];

    if (format === 'json') {
      // JSON export
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exported_at: new Date().toISOString(),
        count: transactions.length,
        transactions,
      });
    } else {
      // CSV export
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // CSV headers
      const headers = ['ID', 'Date', 'Amount', 'Description', 'Bank', 'Category', 'Created At'];
      let csv = headers.join(',') + '\n';

      // CSV rows
      for (const tx of transactions) {
        const row = [
          escapeCsvValue(tx.id),
          escapeCsvValue(tx.date),
          escapeCsvValue(tx.amount),
          escapeCsvValue(tx.description),
          escapeCsvValue(tx.bank),
          escapeCsvValue(tx.category_name),
          escapeCsvValue(tx.created_at),
        ];
        csv += row.join(',') + '\n';
      }

      res.send(csv);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * GET /api/export/summary
 * Export summary report grouped by category and month
 * Supports CSV and JSON formats
 */
router.get('/summary', (req: Request<{}, {}, {}, ExportQuery>, res: Response): void => {
  try {
    const db = getDatabase();
    const { format = 'csv' } = req.query;

    // Validate format
    if (format !== 'csv' && format !== 'json') {
      res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid format. Use "csv" or "json"'));
      return;
    }

    const { whereClause, params } = buildTransactionWhereClause(req.query);

    // Get summary by category
    const byCategoryQuery = `
      SELECT
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY t.category_id
      ORDER BY total_amount ASC
    `;
    const byCategory = db.prepare(byCategoryQuery).all(...params) as {
      category: string;
      transaction_count: number;
      total_amount: number;
      average_amount: number;
    }[];

    // Get summary by month
    const byMonthQuery = `
      SELECT
        strftime('%Y-%m', t.date) as month,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount
      FROM transactions t
      ${whereClause}
      GROUP BY strftime('%Y-%m', t.date)
      ORDER BY month ASC
    `;
    const byMonth = db.prepare(byMonthQuery).all(...params) as {
      month: string;
      transaction_count: number;
      total_amount: number;
      average_amount: number;
    }[];

    // Get summary by category and month (pivot-like data)
    const byCategoryMonthQuery = `
      SELECT
        COALESCE(c.name, 'Uncategorized') as category,
        strftime('%Y-%m', t.date) as month,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY t.category_id, strftime('%Y-%m', t.date)
      ORDER BY category, month
    `;
    const byCategoryMonth = db.prepare(byCategoryMonthQuery).all(...params) as {
      category: string;
      month: string;
      transaction_count: number;
      total_amount: number;
    }[];

    // Get totals
    const totalsQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as average_amount,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM transactions t
      ${whereClause}
    `;
    const totals = db.prepare(totalsQuery).get(...params) as {
      total_count: number;
      total_amount: number;
      average_amount: number;
      min_date: string | null;
      max_date: string | null;
    };

    if (format === 'json') {
      // JSON export
      const filename = `summary_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exported_at: new Date().toISOString(),
        totals: {
          transaction_count: totals.total_count,
          total_amount: totals.total_amount,
          average_amount: totals.average_amount,
          date_range: {
            min: totals.min_date || '',
            max: totals.max_date || '',
          },
        },
        by_category: byCategory,
        by_month: byMonth,
        by_category_month: byCategoryMonth,
      });
    } else {
      // CSV export - multiple sections
      const filename = `summary_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      let csv = '';

      // Totals section
      csv += 'SUMMARY TOTALS\n';
      csv += 'Metric,Value\n';
      csv += `Total Transactions,${totals.total_count}\n`;
      csv += `Total Amount,${totals.total_amount.toFixed(2)}\n`;
      csv += `Average Amount,${totals.average_amount.toFixed(2)}\n`;
      csv += `Date Range Start,${totals.min_date || ''}\n`;
      csv += `Date Range End,${totals.max_date || ''}\n`;
      csv += '\n';

      // By category section
      csv += 'BY CATEGORY\n';
      csv += 'Category,Transaction Count,Total Amount,Average Amount\n';
      for (const row of byCategory) {
        csv += `${escapeCsvValue(row.category)},${row.transaction_count},${row.total_amount.toFixed(2)},${row.average_amount.toFixed(2)}\n`;
      }
      csv += '\n';

      // By month section
      csv += 'BY MONTH\n';
      csv += 'Month,Transaction Count,Total Amount,Average Amount\n';
      for (const row of byMonth) {
        csv += `${escapeCsvValue(row.month)},${row.transaction_count},${row.total_amount.toFixed(2)},${row.average_amount.toFixed(2)}\n`;
      }
      csv += '\n';

      // By category and month section
      csv += 'BY CATEGORY AND MONTH\n';
      csv += 'Category,Month,Transaction Count,Total Amount\n';
      for (const row of byCategoryMonth) {
        csv += `${escapeCsvValue(row.category)},${escapeCsvValue(row.month)},${row.transaction_count},${row.total_amount.toFixed(2)}\n`;
      }

      res.send(csv);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

export default router;
