import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Custom error classes for different HTTP error types
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
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
 * Handles all errors and returns consistent JSON responses
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
  let details: Record<string, string> | undefined;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    if (err instanceof ValidationError) {
      details = err.details;
    }
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON in request body';
  } else if (err.message?.includes('SQLITE')) {
    // SQLite errors
    statusCode = 500;
    message = process.env.NODE_ENV === 'production'
      ? 'Database error'
      : err.message;
  }

  // Log the error
  logger.error(message, {
    statusCode,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    originalError: err.message,
  });

  // Build response
  const response: {
    error: string;
    details?: Record<string, string>;
    path?: string;
    timestamp?: string;
  } = {
    error: message,
  };

  if (details) {
    response.details = details;
  }

  // Include additional debug info in development
  if (process.env.NODE_ENV !== 'production') {
    response.path = req.path;
    response.timestamp = new Date().toISOString();
  }

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
