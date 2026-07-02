import { Theme, ThemeName } from '../types/theme.types';

const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark (Default)',
    isDark: true,
    monacoTheme: 'vs-dark',
    colors: {
      background: '#101112',
      sidebar: '#181818',
      activityBar: '#181818',
      titleBar: '#181818',
      statusBar: '#181818',
      tab: '#181818',
      tabActive: '#101112',
      border: '#2b2b2b',
      text: '#f2f2f2',
      textMuted: '#d6d6d6',
      accent: '#22a6f2',
      hover: '#2a2d2e',
      selected: '#2a2a2a',
      input: '#262626',
      panel: '#101112',
      badge: '#22a6f2',
      button: '#0e639c',
      buttonHover: '#1177bb',
    },
  },
  light: {
    name: 'light',
    displayName: 'Light (Default)',
    isDark: false,
    monacoTheme: 'vs',
    colors: {
      background: '#ffffff',
      sidebar: '#f3f3f3',
      activityBar: '#2c2c2c',
      titleBar: '#dddddd',
      statusBar: '#007acc',
      tab: '#ececec',
      tabActive: '#ffffff',
      border: '#e4e4e4',
      text: '#333333',
      textMuted: '#737373',
      accent: '#007acc',
      hover: '#e8e8e8',
      selected: '#cce5f5',
      input: '#ffffff',
      panel: '#f5f5f5',
      badge: '#007acc',
      button: '#007acc',
      buttonHover: '#0062a3',
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    displayName: 'High Contrast',
    isDark: true,
    monacoTheme: 'hc-black',
    colors: {
      background: '#000000',
      sidebar: '#000000',
      activityBar: '#000000',
      titleBar: '#000000',
      statusBar: '#0000ff',
      tab: '#000000',
      tabActive: '#000000',
      border: '#6fc3df',
      text: '#ffffff',
      textMuted: '#cccccc',
      accent: '#6fc3df',
      hover: '#1a1a1a',
      selected: '#0000ff',
      input: '#000000',
      panel: '#000000',
      badge: '#0000ff',
      button: '#0000ff',
      buttonHover: '#0000cc',
    },
  },
  monokai: {
    name: 'monokai',
    displayName: 'Monokai',
    isDark: true,
    monacoTheme: 'vs-dark',
    colors: {
      background: '#272822',
      sidebar: '#1e1f1c',
      activityBar: '#2b2c27',
      titleBar: '#3b3c37',
      statusBar: '#75715e',
      tab: '#1e1f1c',
      tabActive: '#272822',
      border: '#3b3c37',
      text: '#f8f8f2',
      textMuted: '#deded8',
      accent: '#a6e22e',
      hover: '#3b3c37',
      selected: '#49483e',
      input: '#3b3c37',
      panel: '#272822',
      badge: '#a6e22e',
      button: '#a6e22e',
      buttonHover: '#8ec320',
    },
  },
  'solarized-dark': {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    isDark: true,
    monacoTheme: 'vs-dark',
    colors: {
      background: '#002b36',
      sidebar: '#073642',
      activityBar: '#073642',
      titleBar: '#073642',
      statusBar: '#268bd2',
      tab: '#073642',
      tabActive: '#002b36',
      border: '#073642',
      text: '#d8e5e8',
      textMuted: '#b9cdd2',
      accent: '#268bd2',
      hover: '#073642',
      selected: '#0d3f4e',
      input: '#073642',
      panel: '#002b36',
      badge: '#268bd2',
      button: '#268bd2',
      buttonHover: '#1a72b8',
    },
  },
};

export const themeService = {
  getTheme(name: ThemeName): Theme {
    return themes[name] || themes.dark;
  },

  getAllThemes(): Theme[] {
    return Object.values(themes);
  },

  applyTheme(theme: Theme): void {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    root.setAttribute('data-theme', theme.name);
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;
  },
};
