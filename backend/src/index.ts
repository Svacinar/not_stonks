import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder routes
app.get('/api/transactions', (_req, res) => {
  res.json({ transactions: [], total: 0 });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: [] });
});

app.get('/api/rules', (_req, res) => {
  res.json({ rules: [] });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export default app;
