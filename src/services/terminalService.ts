import { io, Socket } from 'socket.io-client';
import { TerminalSession } from '../types/terminal.types';

class TerminalService {
  private socket: Socket | null = null;
  private sessions: Map<string, TerminalSession> = new Map();

  connect(): Socket {
    if (!this.socket) {
      this.socket = io('/', {
        transports: ['websocket'],
        path: '/socket.io',
      });
    }
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  createSession(shell = '/bin/bash', cwd = process.cwd()): void {
    this.socket?.emit('terminal:create', { shell, cwd });
  }

  destroySession(sessionId: string): void {
    this.socket?.emit('terminal:destroy', { sessionId });
    this.sessions.delete(sessionId);
  }

  sendData(sessionId: string, data: string): void {
    this.socket?.emit('terminal:data', { sessionId, data });
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    this.socket?.emit('terminal:resize', { sessionId, cols, rows });
  }

  onData(callback: (data: { sessionId: string; data: string }) => void): void {
    this.socket?.on('terminal:data', callback);
  }

  onSessionCreated(callback: (session: TerminalSession) => void): void {
    this.socket?.on('terminal:created', callback);
  }

  onSessionClosed(callback: (data: { sessionId: string }) => void): void {
    this.socket?.on('terminal:closed', callback);
  }

  offAll(): void {
    this.socket?.removeAllListeners();
  }
}

export const terminalService = new TerminalService();
