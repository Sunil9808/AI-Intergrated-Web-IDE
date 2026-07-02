import { create } from 'zustand';
import { EditorTab, CursorPosition, EditorSettings, SplitEditorConfig } from '../types/editor.types';

interface EditorStore {
  tabs: EditorTab[];
  activeTabId: string | null;
  splitConfig: SplitEditorConfig;
  settings: EditorSettings;
  
  // Tab actions
  openTab: (tab: EditorTab) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  saveTab: (tabId: string) => void;
  
  // Cursor
  updateCursorPosition: (tabId: string, position: CursorPosition) => void;
  
  // Split editor
  setSplitConfig: (config: Partial<SplitEditorConfig>) => void;
  
  // Settings
  updateSettings: (settings: Partial<EditorSettings>) => void;
  
  // Helpers
  getActiveTab: () => EditorTab | null;
}

const defaultSettings: EditorSettings = {
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'off',
  minimap: true,
  lineNumbers: 'on',
  formatOnSave: true,
  formatOnPaste: false,
  autoSave: true,
  autoSaveDelay: 1000,
  theme: 'vs-dark',
  cursorStyle: 'line',
  renderWhitespace: 'selection',
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  splitConfig: { enabled: false, direction: 'horizontal', ratio: 0.5 },
  settings: defaultSettings,

  openTab: (tab) => {
    set((state) => {
      const existing = state.tabs.find((t) => t.filePath === tab.filePath);
      if (existing) {
        return {
          activeTabId: existing.id,
          tabs: state.tabs.map((item) =>
            item.id === existing.id && !item.isDirty && item.content !== tab.content
              ? { ...item, ...tab, id: item.id, isDirty: false, cursorPosition: item.cursorPosition }
              : item
          ),
        };
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      };
    });
  },

  closeTab: (tabId) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          newActiveId = newTabs[Math.max(0, idx - 1)]?.id || newTabs[0].id;
        } else {
          newActiveId = null;
        }
      }
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  closeAllTabs: () => set({ tabs: [], activeTabId: null }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      ),
    }));
  },

  markTabDirty: (tabId, isDirty) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    }));
  },

  saveTab: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
    }));
  },

  updateCursorPosition: (tabId, position) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, cursorPosition: position } : t
      ),
    }));
  },

  setSplitConfig: (config) => {
    set((state) => ({ splitConfig: { ...state.splitConfig, ...config } }));
  },

  updateSettings: (settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || null;
  },
}));
