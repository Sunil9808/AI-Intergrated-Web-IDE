import { create } from 'zustand';
import { ThemeName } from '../types/theme.types';

interface SettingsStore {
  theme: ThemeName;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  autoSave: boolean;
  formatOnSave: boolean;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  aiEnabled: boolean;
  
  updateTheme: (theme: ThemeName) => void;
  updateFontSize: (size: number) => void;
  updateTabSize: (size: number) => void;
  updateSetting: <K extends keyof SettingsStore>(key: K, value: SettingsStore[K]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  tabSize: 2,
  autoSave: true,
  formatOnSave: true,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  aiEnabled: true,

  updateTheme: (theme) => set({ theme }),
  updateFontSize: (fontSize) => set({ fontSize }),
  updateTabSize: (tabSize) => set({ tabSize }),
  updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
}));
