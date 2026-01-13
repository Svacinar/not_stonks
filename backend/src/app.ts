import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import rulesRouter from './routes/rules';
import exportRouter from './routes/export';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, uploadLimiter } from './middleware/rateLimit';

const app = express();

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
