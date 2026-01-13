import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import rulesRouter from './routes/rules';
import exportRouter from './routes/export';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, uploadLimiter } from './middleware/rateLimit';
import { getDatabase } from './db/database';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();

// Get version from package.json
function getVersion(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8')
    );
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Check database connectivity
function checkDatabaseHealth(): { connected: boolean; error?: string } {
  try {
    const db = getDatabase();
    // Execute a simple query to verify database is accessible
    const result = db.prepare('SELECT 1 as ok').get() as { ok: number };
    return { connected: result.ok === 1 };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown database error',
    };
  }
}

// CORS Configuration
// Defaults to localhost:3000 (frontend dev server) if ALLOWED_ORIGINS not set
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim());
  }
  // Default to localhost origins for development
  return ['http://localhost:3000', 'http://localhost:5173'];
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (e.g., same-origin, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const dbHealth = checkDatabaseHealth();
  const version = getVersion();

  const healthResponse = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version,
    database: dbHealth,
  };

  // Return 503 if database is not connected
  const statusCode = dbHealth.connected ? 200 : 503;
  res.status(statusCode).json(healthResponse);
});

// Routes with rate limiting
// Upload has stricter limit (10/min) due to resource intensity
app.use('/api/upload', uploadLimiter, uploadRouter);
// All other API routes use standard limit (100/min)
app.use('/api/transactions', apiLimiter, transactionsRouter);
app.use('/api/categories', apiLimiter, categoriesRouter);
app.use('/api/rules', apiLimiter, rulesRouter);
app.use('/api/export', apiLimiter, exportRouter);

// 404 handler for unmatched API routes
app.use('/api/*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
