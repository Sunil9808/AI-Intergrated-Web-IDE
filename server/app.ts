import express from 'express';
import cors from 'cors';
import path from 'path';
import fileRoutes from './routes/fileRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import aiRoutes from './routes/aiRoutes';
import terminalRoutes from './routes/terminalRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: process.env.AI_PROVIDER || 'openai',
  });
});

// API routes
app.use('/api/files', fileRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/terminal', terminalRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
