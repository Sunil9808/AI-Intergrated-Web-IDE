export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'monokai' | 'solarized-dark';

export interface Theme {
  name: ThemeName;
  displayName: string;
  isDark: boolean;
  colors: ThemeColors;
  monacoTheme: string;
}

export interface ThemeColors {
  background: string;
  sidebar: string;
  activityBar: string;
  titleBar: string;
  statusBar: string;
  tab: string;
  tabActive: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  hover: string;
  selected: string;
  input: string;
  panel: string;
  badge: string;
  button: string;
  buttonHover: string;
}
