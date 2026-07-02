import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { createServer } from 'http';
import app from './app';
import { initSocketServer } from './socket/socketServer';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 AI Web IDE Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`📁 Workspace: ${process.env.WORKSPACE_ROOT || './storage/workspaces'}\n`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
