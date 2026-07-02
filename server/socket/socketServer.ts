import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { initTerminalSocket } from './terminalSocket';

let io: SocketIOServer;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Initialize terminal socket handlers
    initTerminalSocket(socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} - ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Error from ${socket.id}:`, error);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  return io;
}
