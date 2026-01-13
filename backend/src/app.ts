import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import rulesRouter from './routes/rules';
import exportRouter from './routes/export';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

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

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/export', exportRouter);

// 404 handler for unmatched API routes
app.use('/api/*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
