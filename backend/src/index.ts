import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import rulesRouter from './routes/rules';
import exportRouter from './routes/export';
import { errorHandler, notFoundHandler, logger } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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

// Start server
app.listen(PORT, () => {
  logger.info(`Backend server running on http://localhost:${PORT}`);
});

export default app;
