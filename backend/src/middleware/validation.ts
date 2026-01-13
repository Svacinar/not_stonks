import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { createErrorResponse, ErrorCodes } from './errorHandler';

/**
 * Common validation schemas for reuse across routes
 */

// Positive integer ID schema (for URL parameters like :id)
export const positiveIntSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform((val) => parseInt(val, 10))
  .refine((val) => val > 0, 'Must be a positive integer');

// Optional positive integer schema (for query params)
export const optionalPositiveIntSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform((val) => parseInt(val, 10))
  .refine((val) => val > 0, 'Must be a positive integer')
  .optional();

// Date string schema (YYYY-MM-DD format)
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
  .optional();

// Hex color schema
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #ff0000)');

// Non-empty string schema (trims first, then validates)
export const nonEmptyStringSchema = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, 'Cannot be empty');

/**
 * ID parameter schema for routes with :id
 */
export const idParamSchema = z.object({
  id: positiveIntSchema,
});

/**
 * Transaction list query schema
 */
export const transactionQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  bank: z.string().optional(),
  category: z.string().optional(),
  uncategorized: z.string().optional(),
  search: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Must be a positive integer')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 500, 'Must be between 1 and 500')
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/, 'Must be a non-negative integer')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, 'Must be a non-negative integer')
    .optional(),
  sort: z.enum(['date', 'amount', 'description', 'bank', 'created_at']).optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
});

/**
 * Category create body schema
 */
export const categoryCreateSchema = z.object({
  name: nonEmptyStringSchema,
  color: hexColorSchema,
});

/**
 * Category update body schema
 */
export const categoryUpdateSchema = z.object({
  name: nonEmptyStringSchema.optional(),
  color: hexColorSchema.optional(),
});

/**
 * Rule create body schema
 */
export const ruleCreateSchema = z.object({
  keyword: nonEmptyStringSchema,
  category_id: z.number().int().positive('Category ID must be a positive integer'),
});

/**
 * Rule update body schema
 */
export const ruleUpdateSchema = z.object({
  keyword: nonEmptyStringSchema.optional(),
  category_id: z.number().int().positive('Category ID must be a positive integer').optional(),
});

/**
 * Transaction update body schema
 */
export const transactionUpdateSchema = z.object({
  category_id: z.number().int().positive('Category ID must be a positive integer').nullable(),
});

/**
 * Formats Zod validation errors into a details object
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    details[path || 'value'] = issue.message;
  }

  return details;
}

/**
 * Creates a validation middleware for request params
 * Note: Even though Zod transforms ID to number, we keep it as string in req.params
 * because Express types req.params as ParamsDictionary (string values).
 * The validation ensures the ID is valid; handlers can parse to number if needed.
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the params (this will throw if invalid)
      schema.parse(req.params);
      // Don't replace req.params to avoid type issues with Express
      // The validation has succeeded; handlers can safely use the param
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        const message = Object.values(details)[0] || 'Invalid parameter';
        res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, details));
        return;
      }
      next(error);
    }
  };
}

/**
 * Creates a validation middleware for request query parameters
 * Note: We only validate, don't replace req.query to avoid Express type issues.
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the query params (this will throw if invalid)
      schema.parse(req.query);
      // Don't replace req.query to avoid type issues with Express
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        const message = Object.values(details)[0] || 'Invalid query parameter';
        res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, details));
        return;
      }
      next(error);
    }
  };
}

/**
 * Creates a validation middleware for request body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      // Replace body with parsed/transformed values
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodErrors(error);
        const message = Object.values(details)[0] || 'Invalid request body';
        res.status(400).json(createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, details));
        return;
      }
      next(error);
    }
  };
}

/**
 * Convenience middleware to validate ID parameter
 * Use this on any route with :id parameter
 */
export const validateIdParam = validateParams(idParamSchema);
