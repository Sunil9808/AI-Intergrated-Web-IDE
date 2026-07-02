import { create } from 'zustand';
import { TerminalSession } from '../types/terminal.types';

interface TerminalStore {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  isVisible: boolean;
  height: number;
  
  addSession: (session: TerminalSession) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<TerminalSession>) => void;
  setVisible: (visible: boolean) => void;
  setHeight: (height: number) => void;
  toggleVisible: () => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  isVisible: true,
  height: 250,

  addSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    }));
  },

  removeSession: (sessionId) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId);
      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === sessionId) {
        newActiveId = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
      }
      return { sessions: newSessions, activeSessionId: newActiveId };
    });
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  updateSession: (sessionId, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    }));
  },

  setVisible: (visible) => set({ isVisible: visible }),

  setHeight: (height) => set({ height }),

  toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
}));
