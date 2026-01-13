import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  validateParams,
  validateQuery,
  validateBody,
  validateIdParam,
  idParamSchema,
  positiveIntSchema,
  dateStringSchema,
  hexColorSchema,
  nonEmptyStringSchema,
  transactionQuerySchema,
  categoryCreateSchema,
  ruleCreateSchema,
} from '../src/middleware/validation';
import { z } from 'zod';

// Mock request/response/next
function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusMock: ReturnType<typeof vi.fn>; jsonMock: ReturnType<typeof vi.fn> } {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
  return {
    res: {
      status: statusMock,
      json: jsonMock,
    },
    statusMock,
    jsonMock,
  };
}

describe('Validation Schemas', () => {
  describe('positiveIntSchema', () => {
    it('should accept valid positive integers', () => {
      expect(positiveIntSchema.parse('1')).toBe(1);
      expect(positiveIntSchema.parse('42')).toBe(42);
      expect(positiveIntSchema.parse('1000')).toBe(1000);
    });

    it('should reject non-integer strings', () => {
      expect(() => positiveIntSchema.parse('abc')).toThrow();
      expect(() => positiveIntSchema.parse('1.5')).toThrow();
      expect(() => positiveIntSchema.parse('')).toThrow();
    });

    it('should reject zero and negative integers', () => {
      expect(() => positiveIntSchema.parse('0')).toThrow();
      expect(() => positiveIntSchema.parse('-1')).toThrow();
      expect(() => positiveIntSchema.parse('-42')).toThrow();
    });
  });

  describe('dateStringSchema', () => {
    it('should accept valid date strings', () => {
      expect(dateStringSchema.parse('2024-01-15')).toBe('2024-01-15');
      expect(dateStringSchema.parse('2023-12-31')).toBe('2023-12-31');
    });

    it('should accept undefined (optional)', () => {
      expect(dateStringSchema.parse(undefined)).toBeUndefined();
    });

    it('should reject invalid date formats', () => {
      expect(() => dateStringSchema.parse('01-15-2024')).toThrow();
      expect(() => dateStringSchema.parse('2024/01/15')).toThrow();
      expect(() => dateStringSchema.parse('2024-1-15')).toThrow();
      expect(() => dateStringSchema.parse('invalid')).toThrow();
    });
  });

  describe('hexColorSchema', () => {
    it('should accept valid hex colors', () => {
      expect(hexColorSchema.parse('#ff0000')).toBe('#ff0000');
      expect(hexColorSchema.parse('#FF0000')).toBe('#FF0000');
      expect(hexColorSchema.parse('#000000')).toBe('#000000');
      expect(hexColorSchema.parse('#FFFFFF')).toBe('#FFFFFF');
    });

    it('should reject invalid hex colors', () => {
      expect(() => hexColorSchema.parse('ff0000')).toThrow(); // missing #
      expect(() => hexColorSchema.parse('#fff')).toThrow(); // 3-char format
      expect(() => hexColorSchema.parse('#gggggg')).toThrow(); // invalid chars
      expect(() => hexColorSchema.parse('red')).toThrow(); // color name
    });
  });

  describe('nonEmptyStringSchema', () => {
    it('should accept non-empty strings and trim them', () => {
      expect(nonEmptyStringSchema.parse('hello')).toBe('hello');
      expect(nonEmptyStringSchema.parse('  hello  ')).toBe('hello');
    });

    it('should reject empty strings', () => {
      expect(() => nonEmptyStringSchema.parse('')).toThrow();
      expect(() => nonEmptyStringSchema.parse('   ')).toThrow();
    });
  });

  describe('idParamSchema', () => {
    it('should accept valid id params', () => {
      expect(idParamSchema.parse({ id: '1' })).toEqual({ id: 1 });
      expect(idParamSchema.parse({ id: '42' })).toEqual({ id: 42 });
    });

    it('should reject invalid id params', () => {
      expect(() => idParamSchema.parse({ id: 'abc' })).toThrow();
      expect(() => idParamSchema.parse({ id: '0' })).toThrow();
      expect(() => idParamSchema.parse({ id: '-1' })).toThrow();
      expect(() => idParamSchema.parse({})).toThrow();
    });
  });

  describe('transactionQuerySchema', () => {
    it('should accept valid query params', () => {
      const result = transactionQuerySchema.parse({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: '100',
        offset: '0',
        sort: 'date',
        order: 'desc',
      });
      expect(result.startDate).toBe('2024-01-01');
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it('should reject invalid limit values', () => {
      expect(() => transactionQuerySchema.parse({ limit: '0' })).toThrow();
      expect(() => transactionQuerySchema.parse({ limit: '501' })).toThrow();
      expect(() => transactionQuerySchema.parse({ limit: 'abc' })).toThrow();
    });

    it('should reject invalid sort columns', () => {
      expect(() => transactionQuerySchema.parse({ sort: 'invalid' })).toThrow();
    });
  });

  describe('categoryCreateSchema', () => {
    it('should accept valid category data', () => {
      const result = categoryCreateSchema.parse({ name: 'Food', color: '#ff0000' });
      expect(result.name).toBe('Food');
      expect(result.color).toBe('#ff0000');
    });

    it('should reject missing fields', () => {
      expect(() => categoryCreateSchema.parse({ name: 'Food' })).toThrow();
      expect(() => categoryCreateSchema.parse({ color: '#ff0000' })).toThrow();
    });
  });

  describe('ruleCreateSchema', () => {
    it('should accept valid rule data', () => {
      const result = ruleCreateSchema.parse({ keyword: 'grocery', category_id: 1 });
      expect(result.keyword).toBe('grocery');
      expect(result.category_id).toBe(1);
    });

    it('should reject invalid category_id', () => {
      expect(() => ruleCreateSchema.parse({ keyword: 'grocery', category_id: 0 })).toThrow();
      expect(() => ruleCreateSchema.parse({ keyword: 'grocery', category_id: -1 })).toThrow();
      expect(() => ruleCreateSchema.parse({ keyword: 'grocery', category_id: 'abc' })).toThrow();
    });
  });
});

describe('Validation Middleware', () => {
  describe('validateParams', () => {
    it('should pass valid params', () => {
      const middleware = validateParams(idParamSchema);
      const req = createMockReq({ params: { id: '42' } }) as Request;
      const { res } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Params remain as string (not transformed) to preserve Express types
      expect(req.params.id).toBe('42');
    });

    it('should return 400 for invalid params', () => {
      const middleware = validateParams(idParamSchema);
      const req = createMockReq({ params: { id: 'invalid' } }) as Request;
      const { res, statusMock, jsonMock } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.any(Object),
          }),
        })
      );
    });

    it('should reject negative IDs', () => {
      const middleware = validateParams(idParamSchema);
      const req = createMockReq({ params: { id: '-5' } }) as Request;
      const { res, statusMock, jsonMock } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should reject zero ID', () => {
      const middleware = validateParams(idParamSchema);
      const req = createMockReq({ params: { id: '0' } }) as Request;
      const { res, statusMock } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    it('should pass valid query params', () => {
      const schema = z.object({ page: z.string().optional() });
      const middleware = validateQuery(schema);
      const req = createMockReq({ query: { page: '1' } }) as Request;
      const { res } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid query params', () => {
      const schema = z.object({ page: z.string().regex(/^\d+$/) });
      const middleware = validateQuery(schema);
      const req = createMockReq({ query: { page: 'invalid' } }) as Request;
      const { res, statusMock, jsonMock } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('validateBody', () => {
    it('should pass valid body', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validateBody(schema);
      const req = createMockReq({ body: { name: 'Test' } }) as Request;
      const { res } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for invalid body', () => {
      const schema = z.object({ name: z.string().min(1) });
      const middleware = validateBody(schema);
      const req = createMockReq({ body: { name: '' } }) as Request;
      const { res, statusMock, jsonMock } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should transform body values', () => {
      const schema = z.object({ name: z.string().transform((v) => v.toUpperCase()) });
      const middleware = validateBody(schema);
      const req = createMockReq({ body: { name: 'test' } }) as Request;
      const { res } = createMockRes();
      const next = vi.fn();

      middleware(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('TEST');
    });
  });

  describe('validateIdParam convenience middleware', () => {
    it('should validate ID parameter and call next on success', () => {
      const req = createMockReq({ params: { id: '123' } }) as Request;
      const { res } = createMockRes();
      const next = vi.fn();

      validateIdParam(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Param remains as string (validation only, no transformation)
      expect(req.params.id).toBe('123');
    });

    it('should reject invalid ID parameter', () => {
      const req = createMockReq({ params: { id: 'abc' } }) as Request;
      const { res, statusMock, jsonMock } = createMockRes();
      const next = vi.fn();

      validateIdParam(req, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('positive integer'),
          }),
        })
      );
    });
  });
});
