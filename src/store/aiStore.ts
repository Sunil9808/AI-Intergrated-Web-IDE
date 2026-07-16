import { create } from 'zustand';
import { ChatMessage, AIContext, AISettings } from '../types/ai.types';

interface AIStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  context: AIContext;
  settings: AISettings;
  error: string | null;
  
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  appendToLastMessage: (chunk: string) => void;
  finalizeStreaming: () => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  setLoading: (loading: boolean) => void;
  updateContext: (context: Partial<AIContext>) => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  setError: (error: string | null) => void;
}

const defaultSettings: AISettings = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: '',
  maxTokens: 2000,
  temperature: 0.7,
  streamResponses: true,
  includeFileContext: true,
  includeWorkspaceContext: true,
  inlineCompletionsEnabled: true,
  inlineCompletionsDelay: 400,
};

export const useAIStore = create<AIStore>((set) => ({
  messages: [],
  isStreaming: false,
  isLoading: false,
  context: {},
  settings: defaultSettings,
  error: null,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    });
  },

  appendToLastMessage: (chunk) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...last,
          content: last.content + chunk,
          isStreaming: true,
        };
      }
      return { messages };
    });
  },

  finalizeStreaming: () => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          isStreaming: false,
        };
      }
      return { messages, isStreaming: false };
    });
  },

  clearMessages: () => set({ messages: [] }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setLoading: (loading) => set({ isLoading: loading }),

  updateContext: (context) => {
    set((state) => ({ context: { ...state.context, ...context } }));
  },

  updateSettings: (settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }));
  },

  setError: (error) => set({ error }),
}));
