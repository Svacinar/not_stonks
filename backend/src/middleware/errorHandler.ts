import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Standard error response format
 * All API errors should return: { success: false, error: { code, message, details? } }
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Error codes for different error types
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Creates a standard error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, string>
): StandardErrorResponse {
  const response: StandardErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Custom error classes for different HTTP error types
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode = ErrorCodes.INTERNAL_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, ErrorCodes.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, ErrorCodes.BAD_REQUEST);
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, ErrorCodes.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * Logger utility for error logging
 * In production, this could be enhanced with file logging or external services
 */
export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'error',
      message,
      ...meta,
    };

    if (process.env.NODE_ENV === 'production') {
      // In production, log as JSON for easier parsing
      console.error(JSON.stringify(logEntry));
    } else {
      // In development, log more readable format
      console.error(`[${timestamp}] ERROR: ${message}`);
      if (meta) {
        console.error('Details:', JSON.stringify(meta, null, 2));
      }
    }
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ timestamp, level: 'warn', message, ...meta }));
    } else {
      console.warn(`[${timestamp}] WARN: ${message}`);
      if (meta) {
        console.warn('Details:', JSON.stringify(meta, null, 2));
      }
    }
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ timestamp, level: 'info', message, ...meta }));
    } else {
      console.log(`[${timestamp}] INFO: ${message}`);
      if (meta) {
        console.log('Details:', JSON.stringify(meta, null, 2));
      }
    }
  },
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 * Handles all errors and returns consistent JSON responses in standard format:
 * { success: false, error: { code, message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default values
  let statusCode = 500;
  let message = 'Internal server error';
  let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;
  let details: Record<string, string> | undefined;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;

    if (err instanceof ValidationError) {
      details = err.details;
    }
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = ErrorCodes.BAD_REQUEST;
  } else if (err.message?.includes('SQLITE')) {
    // SQLite errors
    statusCode = 500;
    code = ErrorCodes.DATABASE_ERROR;
    message = process.env.NODE_ENV === 'production'
      ? 'Database error'
      : err.message;
  }

  // Log the error
  logger.error(message, {
    statusCode,
    code,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    originalError: err.message,
  });

  // Build standardized error response
  const response = createErrorResponse(code, message, details);

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch promise rejections
 * Wraps async route handlers to properly forward errors to error middleware
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
