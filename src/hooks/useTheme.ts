import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { themeService } from '../services/themeService';
import { ThemeName } from '../types/theme.types';

export function useTheme() {
  const { theme, updateTheme } = useSettingsStore();

  const setTheme = useCallback((name: ThemeName) => {
    updateTheme(name);
    const t = themeService.getTheme(name);
    themeService.applyTheme(t);
  }, [updateTheme]);

  const currentTheme = themeService.getTheme(theme);
  const allThemes = themeService.getAllThemes();

  return { theme, currentTheme, allThemes, setTheme };
}
