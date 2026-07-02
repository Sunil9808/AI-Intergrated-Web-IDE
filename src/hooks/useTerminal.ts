import { useCallback } from 'react';
import { useTerminalStore } from '../store/terminalStore';
import { terminalService } from '../services/terminalService';
import { v4 as uuidv4 } from '../utils/uuid';

export function useTerminal() {
  const { sessions, activeSessionId, addSession, removeSession, setActiveSession, isVisible, setVisible } = useTerminalStore();

  const createSession = useCallback(() => {
    const sessionId = uuidv4();
    terminalService.createSession('/bin/bash', '/workspace');
  }, []);

  const destroySession = useCallback((sessionId: string) => {
    terminalService.destroySession(sessionId);
    removeSession(sessionId);
  }, [removeSession]);

  const sendCommand = useCallback((sessionId: string, command: string) => {
    terminalService.sendData(sessionId, command + '\n');
  }, []);

  return {
    sessions,
    activeSessionId,
    isVisible,
    createSession,
    destroySession,
    sendCommand,
    setActiveSession,
    setVisible,
  };
}
