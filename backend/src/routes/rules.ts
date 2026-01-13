import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import type { CategoryRule, Category } from 'shared/types';
import { createErrorResponse, ErrorCodes } from '../middleware/errorHandler';
import { validateIdParam } from '../middleware/validation';

const router = Router();

interface RuleWithCategory extends CategoryRule {
  category_name: string;
}

interface CreateRuleBody {
  keyword: string;
  category_id: number;
}

interface UpdateRuleBody {
  keyword?: string;
  category_id?: number;
}

/**
 * GET /api/rules
 * List all rules with category names
 */
router.get('/', (_req: Request, res: Response): void => {
  try {
    const db = getDatabase();

    const query = `
      SELECT
        cr.id,
        cr.keyword,
        cr.category_id,
        cr.created_at,
        c.name as category_name
      FROM category_rules cr
      JOIN categories c ON cr.category_id = c.id
      ORDER BY cr.keyword ASC
    `;

    const rules = db.prepare(query).all() as RuleWithCategory[];

    res.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * POST /api/rules
 * Create a new rule
 */
router.post('/', (req: Request<{}, {}, CreateRuleBody>, res: Response): void => {
  try {
    const db = getDatabase();
    const { keyword, category_id } = req.body;

    // Validate required fields
    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Keyword is required'));
      return;
    }

    if (category_id === undefined || category_id === null || typeof category_id !== 'number') {
      res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Category ID is required'));
      return;
    }

    // Verify category exists
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id) as Category | undefined;

    if (!category) {
      res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Category not found'));
      return;
    }

    // Check for duplicate keyword (case-insensitive)
    const existing = db
      .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?)')
      .get(keyword.trim());

    if (existing) {
      res.status(409).json(createErrorResponse(ErrorCodes.CONFLICT, 'A rule with this keyword already exists'));
      return;
    }

    // Insert new rule
    const result = db
      .prepare('INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)')
      .run(keyword.trim().toLowerCase(), category_id);

    // Fetch the created rule with category name
    const query = `
      SELECT
        cr.id,
        cr.keyword,
        cr.category_id,
        cr.created_at,
        c.name as category_name
      FROM category_rules cr
      JOIN categories c ON cr.category_id = c.id
      WHERE cr.id = ?
    `;

    const newRule = db.prepare(query).get(result.lastInsertRowid) as RuleWithCategory;

    res.status(201).json(newRule);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * PATCH /api/rules/:id
 * Update a rule
 */
router.patch('/:id', validateIdParam, (req: Request<{ id: string }, {}, UpdateRuleBody>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { keyword, category_id } = req.body;

    // Check rule exists
    const existing = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(id) as CategoryRule | undefined;

    if (!existing) {
      res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Rule not found'));
      return;
    }

    // Build update fields
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (keyword !== undefined) {
      if (typeof keyword !== 'string' || keyword.trim() === '') {
        res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Keyword cannot be empty'));
        return;
      }

      // Check for duplicate keyword (case-insensitive), excluding current rule
      const duplicate = db
        .prepare('SELECT id FROM category_rules WHERE LOWER(keyword) = LOWER(?) AND id != ?')
        .get(keyword.trim(), id);

      if (duplicate) {
        res.status(409).json(createErrorResponse(ErrorCodes.CONFLICT, 'A rule with this keyword already exists'));
        return;
      }

      updates.push('keyword = ?');
      params.push(keyword.trim().toLowerCase());
    }

    if (category_id !== undefined) {
      if (typeof category_id !== 'number') {
        res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Category ID must be a number'));
        return;
      }

      // Verify category exists
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id) as Category | undefined;

      if (!category) {
        res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Category not found'));
        return;
      }

      updates.push('category_id = ?');
      params.push(category_id);
    }

    if (updates.length === 0) {
      res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'No valid fields to update'));
      return;
    }

    params.push(parseInt(id, 10));
    db.prepare(`UPDATE category_rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Fetch the updated rule with category name
    const query = `
      SELECT
        cr.id,
        cr.keyword,
        cr.category_id,
        cr.created_at,
        c.name as category_name
      FROM category_rules cr
      JOIN categories c ON cr.category_id = c.id
      WHERE cr.id = ?
    `;

    const updated = db.prepare(query).get(id) as RuleWithCategory;

    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * DELETE /api/rules/:id
 * Delete a rule
 */
router.delete('/:id', validateIdParam, (req: Request<{ id: string }>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Check rule exists
    const existing = db.prepare('SELECT * FROM category_rules WHERE id = ?').get(id) as CategoryRule | undefined;

    if (!existing) {
      res.status(404).json(createErrorResponse(ErrorCodes.NOT_FOUND, 'Rule not found'));
      return;
    }

    // Delete the rule
    db.prepare('DELETE FROM category_rules WHERE id = ?').run(id);

    res.json({
      success: true,
      deleted: 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

/**
 * POST /api/rules/apply
 * Re-apply all rules to uncategorized transactions
 * Uses bulk UPDATE for O(n+m) performance instead of O(n*m) nested loop
 */
router.post('/apply', (_req: Request, res: Response): void => {
  try {
    const db = getDatabase();

    // Check if there are any rules
    const ruleCount = db.prepare('SELECT COUNT(*) as count FROM category_rules').get() as { count: number };

    if (ruleCount.count === 0) {
      res.json({
        success: true,
        categorized: 0,
        message: 'No rules to apply',
      });
      return;
    }

    // Check if there are uncategorized transactions
    const uncategorizedCount = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id IS NULL')
      .get() as { count: number };

    if (uncategorizedCount.count === 0) {
      res.json({
        success: true,
        categorized: 0,
        message: 'No uncategorized transactions',
      });
      return;
    }

    // Bulk UPDATE using a subquery to find first matching rule per transaction
    // The MIN(cr.keyword) ensures we get the alphabetically first matching rule
    // (preserving the "first matching rule" behavior from the original implementation)
    const bulkUpdateResult = db.prepare(`
      UPDATE transactions
      SET category_id = (
        SELECT cr.category_id
        FROM category_rules cr
        WHERE LOWER(transactions.description) LIKE '%' || LOWER(cr.keyword) || '%'
        ORDER BY cr.keyword ASC
        LIMIT 1
      )
      WHERE category_id IS NULL
        AND EXISTS (
          SELECT 1 FROM category_rules cr
          WHERE LOWER(transactions.description) LIKE '%' || LOWER(cr.keyword) || '%'
        )
    `).run();

    res.json({
      success: true,
      categorized: bulkUpdateResult.changes,
      total_uncategorized: uncategorizedCount.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json(createErrorResponse(ErrorCodes.INTERNAL_ERROR, message));
  }
});

export default router;
