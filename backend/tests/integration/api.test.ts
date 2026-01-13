import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { getDatabase, resetDatabase, closeDatabase } from '../../src/db/database';
import path from 'path';
import os from 'os';
import { seedStandardTestData, getCategoryId } from '../fixtures';

// Use a unique test database for integration tests
const testDbPath = path.join(os.tmpdir(), `integration-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;

describe('API Integration Tests', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    closeDatabase();
    resetDatabase();
  });

  // =========================================
  // Health Check Endpoint
  // =========================================
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  // =========================================
  // Transactions Endpoints
  // =========================================
  describe('Transactions API', () => {
    describe('GET /api/transactions', () => {
      it('should return empty list when no transactions', async () => {
        const response = await request(app).get('/api/transactions');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transactions');
        expect(response.body.transactions).toEqual([]);
        expect(response.body.total).toBe(0);
      });

      it('should return all transactions', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app).get('/api/transactions');

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(7);
        expect(response.body.total).toBe(7);
      });

      it('should filter by date range', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(4);
      });

      it('should filter by bank', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ bank: 'CSOB' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(3);
        expect(response.body.transactions.every((t: { bank: string }) => t.bank === 'CSOB')).toBe(true);
      });

      it('should filter by multiple banks', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ bank: 'CSOB,Revolut' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(6);
      });

      it('should filter uncategorized transactions', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ uncategorized: 'true' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(3);
        expect(response.body.transactions.every((t: { category_id: number | null }) => t.category_id === null)).toBe(true);
      });

      it('should search by description', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ search: 'ALBERT' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(1);
        expect(response.body.transactions[0].description).toContain('ALBERT');
      });

      it('should paginate results', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ limit: '3', offset: '0' });

        expect(response.status).toBe(200);
        expect(response.body.transactions.length).toBe(3);
        expect(response.body.total).toBe(7);
        expect(response.body.limit).toBe(3);
        expect(response.body.offset).toBe(0);
      });

      it('should sort by amount ascending', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions')
          .query({ sort: 'amount', order: 'asc' });

        expect(response.status).toBe(200);
        const amounts = response.body.transactions.map((t: { amount: number }) => t.amount);
        expect(amounts[0]).toBe(-200.0);
      });
    });

    describe('GET /api/transactions/stats', () => {
      it('should return stats', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app).get('/api/transactions/stats');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_count', 7);
        expect(response.body).toHaveProperty('total_amount', -525.0);
        expect(response.body).toHaveProperty('by_category');
        expect(response.body).toHaveProperty('by_bank');
        expect(response.body).toHaveProperty('by_month');
        expect(response.body).toHaveProperty('date_range');
      });

      it('should filter stats by date range', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/transactions/stats')
          .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

        expect(response.status).toBe(200);
        expect(response.body.total_count).toBe(4);
      });
    });

    describe('GET /api/transactions/:id', () => {
      it('should return a single transaction', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const first = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number };

        const response = await request(app).get(`/api/transactions/${first.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', first.id);
        expect(response.body).toHaveProperty('date');
        expect(response.body).toHaveProperty('amount');
        expect(response.body).toHaveProperty('description');
      });

      it('should return 404 for non-existent transaction', async () => {
        const response = await request(app).get('/api/transactions/99999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Transaction not found');
      });
    });

    describe('PATCH /api/transactions/:id', () => {
      it('should update transaction category', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const uncategorized = db
          .prepare('SELECT id FROM transactions WHERE category_id IS NULL LIMIT 1')
          .get() as { id: number };
        const transportCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Transport'")
          .get() as { id: number };

        const response = await request(app)
          .patch(`/api/transactions/${uncategorized.id}`)
          .send({ category_id: transportCat.id });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category_id', transportCat.id);
        expect(response.body).toHaveProperty('category_name', 'Transport');
      });

      it('should return 404 for non-existent transaction', async () => {
        const response = await request(app)
          .patch('/api/transactions/99999')
          .send({ category_id: 1 });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Transaction not found');
      });

      it('should return 400 for invalid category_id', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const tx = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number };

        const response = await request(app)
          .patch(`/api/transactions/${tx.id}`)
          .send({ category_id: 99999 });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid category_id');
      });

      it('should allow setting category to null', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const categorized = db
          .prepare('SELECT id FROM transactions WHERE category_id IS NOT NULL LIMIT 1')
          .get() as { id: number };

        const response = await request(app)
          .patch(`/api/transactions/${categorized.id}`)
          .send({ category_id: null });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category_id', null);
      });
    });

    describe('DELETE /api/transactions/:id', () => {
      it('should delete a transaction', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const tx = db.prepare('SELECT id FROM transactions LIMIT 1').get() as { id: number };

        const response = await request(app).delete(`/api/transactions/${tx.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('deleted', 1);
      });

      it('should return 404 for non-existent transaction', async () => {
        const response = await request(app).delete('/api/transactions/99999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Transaction not found');
      });
    });
  });

  // =========================================
  // Categories Endpoints
  // =========================================
  describe('Categories API', () => {
    describe('GET /api/categories', () => {
      it('should return default categories', async () => {
        const response = await request(app).get('/api/categories');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('categories');
        expect(Array.isArray(response.body.categories)).toBe(true);
        expect(response.body.categories.length).toBeGreaterThan(0);
      });

      it('should include transaction counts', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app).get('/api/categories');

        expect(response.status).toBe(200);
        const foodCategory = response.body.categories.find((c: { name: string }) => c.name === 'Food');
        expect(foodCategory).toBeDefined();
        expect(foodCategory).toHaveProperty('transaction_count', 2);
      });
    });

    describe('GET /api/categories/:id', () => {
      it('should return a single category with stats', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        const response = await request(app).get(`/api/categories/${foodCat.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name', 'Food');
        expect(response.body).toHaveProperty('transaction_count');
        expect(response.body).toHaveProperty('total_amount');
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app).get('/api/categories/99999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Category not found');
      });
    });

    describe('POST /api/categories', () => {
      it('should create a new category', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ name: 'Test Category', color: '#ff0000' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('name', 'Test Category');
        expect(response.body).toHaveProperty('color', '#ff0000');
        expect(response.body).toHaveProperty('id');
      });

      it('should return 400 if name is missing', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ color: '#ff0000' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Name is required');
      });

      it('should return 400 if color is missing', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ name: 'Test Category' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Color is required');
      });

      it('should return 400 for invalid color format', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ name: 'Test Category', color: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('valid hex color');
      });

      it('should return 409 for duplicate category name', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ name: 'Food', color: '#ff0000' });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('already exists');
      });
    });

    describe('PATCH /api/categories/:id', () => {
      it('should update category name', async () => {
        const db = getDatabase();
        const cat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        const response = await request(app)
          .patch(`/api/categories/${cat.id}`)
          .send({ name: 'Food & Dining' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name', 'Food & Dining');
      });

      it('should update category color', async () => {
        const db = getDatabase();
        const cat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        const response = await request(app)
          .patch(`/api/categories/${cat.id}`)
          .send({ color: '#0000ff' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('color', '#0000ff');
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app)
          .patch('/api/categories/99999')
          .send({ name: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Category not found');
      });

      it('should return 400 for empty name', async () => {
        const db = getDatabase();
        const cat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        const response = await request(app)
          .patch(`/api/categories/${cat.id}`)
          .send({ name: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('should delete a category', async () => {
        // Create a new category to delete
        const createResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'ToDelete', color: '#ff0000' });

        const response = await request(app)
          .delete(`/api/categories/${createResponse.body.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('deleted', 1);
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app).delete('/api/categories/99999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Category not found');
      });
    });
  });

  // =========================================
  // Rules Endpoints
  // =========================================
  describe('Rules API', () => {
    describe('GET /api/rules', () => {
      it('should return empty rules list initially', async () => {
        const response = await request(app).get('/api/rules');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('rules');
        expect(Array.isArray(response.body.rules)).toBe(true);
      });

      it('should return created rules', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        // Create a rule
        await request(app)
          .post('/api/rules')
          .send({ keyword: 'grocery', category_id: foodCat.id });

        const response = await request(app).get('/api/rules');

        expect(response.status).toBe(200);
        expect(response.body.rules.length).toBeGreaterThan(0);
        expect(response.body.rules[0]).toHaveProperty('keyword');
        expect(response.body.rules[0]).toHaveProperty('category_name');
      });
    });

    describe('POST /api/rules', () => {
      it('should create a new rule', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        const response = await request(app)
          .post('/api/rules')
          .send({ keyword: 'starbucks', category_id: foodCat.id });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('keyword', 'starbucks');
        expect(response.body).toHaveProperty('category_id', foodCat.id);
        expect(response.body).toHaveProperty('category_name', 'Food');
      });

      it('should return 400 if keyword is missing', async () => {
        const response = await request(app)
          .post('/api/rules')
          .send({ category_id: 1 });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Keyword is required');
      });

      it('should return 400 if category_id is missing', async () => {
        const response = await request(app)
          .post('/api/rules')
          .send({ keyword: 'test' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Category ID is required');
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app)
          .post('/api/rules')
          .send({ keyword: 'test', category_id: 99999 });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Category not found');
      });

      it('should return 409 for duplicate keyword', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        // Create first rule
        await request(app)
          .post('/api/rules')
          .send({ keyword: 'duplicate', category_id: foodCat.id });

        // Try to create duplicate
        const response = await request(app)
          .post('/api/rules')
          .send({ keyword: 'duplicate', category_id: foodCat.id });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('already exists');
      });
    });

    describe('PATCH /api/rules/:id', () => {
      it('should update rule keyword', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        // Create a rule
        const createResponse = await request(app)
          .post('/api/rules')
          .send({ keyword: 'original', category_id: foodCat.id });

        const response = await request(app)
          .patch(`/api/rules/${createResponse.body.id}`)
          .send({ keyword: 'updated' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('keyword', 'updated');
      });

      it('should update rule category', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };
        const transportCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Transport'")
          .get() as { id: number };

        // Create a rule
        const createResponse = await request(app)
          .post('/api/rules')
          .send({ keyword: 'testrule', category_id: foodCat.id });

        const response = await request(app)
          .patch(`/api/rules/${createResponse.body.id}`)
          .send({ category_id: transportCat.id });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category_id', transportCat.id);
        expect(response.body).toHaveProperty('category_name', 'Transport');
      });

      it('should return 404 for non-existent rule', async () => {
        const response = await request(app)
          .patch('/api/rules/99999')
          .send({ keyword: 'updated' });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Rule not found');
      });
    });

    describe('DELETE /api/rules/:id', () => {
      it('should delete a rule', async () => {
        const db = getDatabase();
        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        // Create a rule
        const createResponse = await request(app)
          .post('/api/rules')
          .send({ keyword: 'todelete', category_id: foodCat.id });

        const response = await request(app)
          .delete(`/api/rules/${createResponse.body.id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('deleted', 1);
      });

      it('should return 404 for non-existent rule', async () => {
        const response = await request(app).delete('/api/rules/99999');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Rule not found');
      });
    });

    describe('POST /api/rules/apply', () => {
      it('should apply rules to uncategorized transactions', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const foodCat = db
          .prepare("SELECT id FROM categories WHERE name = 'Food'")
          .get() as { id: number };

        // Create a rule that matches NETFLIX
        await request(app)
          .post('/api/rules')
          .send({ keyword: 'netflix', category_id: foodCat.id });

        const response = await request(app).post('/api/rules/apply');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('categorized');
        expect(response.body.categorized).toBeGreaterThan(0);
      });

      it('should return 0 categorized when no rules exist', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app).post('/api/rules/apply');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('categorized', 0);
        expect(response.body).toHaveProperty('message', 'No rules to apply');
      });
    });
  });

  // =========================================
  // Export Endpoints
  // =========================================
  describe('Export API', () => {
    describe('GET /api/export/transactions', () => {
      it('should export transactions as CSV', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/export/transactions')
          .query({ format: 'csv' });

        expect(response.status).toBe(200);
        expect(response.type).toBe('text/csv');
        expect(response.text).toContain('ID,Date,Amount,Description,Bank,Category,Created At');
        expect(response.text).toContain('ALBERT');
      });

      it('should export transactions as JSON', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/export/transactions')
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toHaveProperty('exported_at');
        expect(response.body).toHaveProperty('count', 7);
        expect(response.body).toHaveProperty('transactions');
      });

      it('should filter exports by date range', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/export/transactions')
          .query({ format: 'json', startDate: '2024-01-01', endDate: '2024-01-31' });

        expect(response.status).toBe(200);
        expect(response.body.count).toBe(4);
      });

      it('should return 400 for invalid format', async () => {
        const response = await request(app)
          .get('/api/export/transactions')
          .query({ format: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/export/summary', () => {
      it('should export summary as CSV', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/export/summary')
          .query({ format: 'csv' });

        expect(response.status).toBe(200);
        expect(response.type).toBe('text/csv');
        expect(response.text).toContain('SUMMARY TOTALS');
        expect(response.text).toContain('BY CATEGORY');
        expect(response.text).toContain('BY MONTH');
      });

      it('should export summary as JSON', async () => {
        const db = getDatabase();
        seedStandardTestData(db);

        const response = await request(app)
          .get('/api/export/summary')
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.type).toBe('application/json');
        expect(response.body).toHaveProperty('exported_at');
        expect(response.body).toHaveProperty('totals');
        expect(response.body).toHaveProperty('by_category');
        expect(response.body).toHaveProperty('by_month');
        expect(response.body).toHaveProperty('by_category_month');
      });
    });
  });

  // =========================================
  // 404 Handler
  // =========================================
  describe('404 Handler', () => {
    it('should return 404 for unknown API routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
