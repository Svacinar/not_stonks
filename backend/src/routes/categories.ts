import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import type { Category } from 'shared/types';

const router = Router();

interface CategoryWithCount extends Category {
  transaction_count: number;
}

interface CategoryStats extends Category {
  transaction_count: number;
  total_amount: number;
}

interface CreateCategoryBody {
  name: string;
  color: string;
}

interface UpdateCategoryBody {
  name?: string;
  color?: string;
}

/**
 * GET /api/categories
 * List all categories with transaction counts
 */
router.get('/', (_req: Request, res: Response): void => {
  try {
    const db = getDatabase();

    const query = `
      SELECT
        c.id,
        c.name,
        c.color,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const categories = db.prepare(query).all() as CategoryWithCount[];

    res.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/categories/:id
 * Get a single category with stats
 */
router.get('/:id', (req: Request<{ id: string }>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const query = `
      SELECT
        c.id,
        c.name,
        c.color,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `;

    const category = db.prepare(query).get(id) as CategoryStats | undefined;

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', (req: Request<{}, {}, CreateCategoryBody>, res: Response): void => {
  try {
    const db = getDatabase();
    const { name, color } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!color || typeof color !== 'string' || color.trim() === '') {
      res.status(400).json({ error: 'Color is required' });
      return;
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(color)) {
      res.status(400).json({ error: 'Color must be a valid hex color (e.g., #ff0000)' });
      return;
    }

    // Check for duplicate name (case-insensitive)
    const existing = db
      .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
      .get(name.trim());

    if (existing) {
      res.status(409).json({ error: 'A category with this name already exists' });
      return;
    }

    // Insert new category
    const result = db
      .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
      .run(name.trim(), color);

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;

    res.status(201).json(newCategory);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/categories/:id
 * Update a category
 */
router.patch('/:id', (req: Request<{ id: string }, {}, UpdateCategoryBody>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, color } = req.body;

    // Check category exists
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Build update fields
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'Name cannot be empty' });
        return;
      }

      // Check for duplicate name (case-insensitive), excluding current category
      const duplicate = db
        .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get(name.trim(), id);

      if (duplicate) {
        res.status(409).json({ error: 'A category with this name already exists' });
        return;
      }

      updates.push('name = ?');
      params.push(name.trim());
    }

    if (color !== undefined) {
      if (typeof color !== 'string' || color.trim() === '') {
        res.status(400).json({ error: 'Color cannot be empty' });
        return;
      }

      // Validate color format
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(color)) {
        res.status(400).json({ error: 'Color must be a valid hex color (e.g., #ff0000)' });
        return;
      }

      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    params.push(parseInt(id, 10));
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;

    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (transactions with this category_id will be set to null)
 */
router.delete('/:id', (req: Request<{ id: string }>, res: Response): void => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Check category exists
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Get count of affected transactions (for response)
    const affectedCount = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
      .get(id) as { count: number };

    // Delete the category (foreign key ON DELETE SET NULL will handle transactions)
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({
      success: true,
      deleted: 1,
      transactions_affected: affectedCount.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

export default router;
