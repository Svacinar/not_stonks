import app from './app';
import { logger } from './middleware/errorHandler';

const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, () => {
  logger.info(`Backend server running on http://localhost:${PORT}`);
});

export default app;
