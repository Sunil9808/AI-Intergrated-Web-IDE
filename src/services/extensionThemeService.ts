/**
 * Extension Theme Service
 * Applies Monaco editor themes and IDE chrome CSS variables
 * when theme/icon extensions are installed.
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  extensionId: string;
  type: 'dark' | 'light';
  colors: Record<string, string>;
  monacoTheme: MonacoThemeData;
}

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

// ── Built-in theme definitions ──────────────────────────────────────────────

const ONE_DARK_PRO: ThemeDefinition = {
  id: 'one-dark-pro',
  name: 'One Dark Pro',
  extensionId: 'zhuangtongfa.material-theme',
  type: 'dark',
  colors: {
    '--color-background': '#282c34',
    '--color-sidebar': '#21252b',
    '--color-activityBar': '#21252b',
    '--color-titleBar': '#21252b',
    '--color-statusBar': '#21252b',
    '--color-tab': '#21252b',
    '--color-tabActive': '#282c34',
    '--color-border': '#181a1f',
    '--color-text': '#abb2bf',
    '--color-textMuted': '#636d83',
    '--color-accent': '#61afef',
    '--color-hover': '#2c313a',
    '--color-selected': '#3a3f4b',
    '--color-panel': '#21252b',
    '--color-badge': '#528bff',
    '--color-button': '#528bff',
  },
  monacoTheme: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'class', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'operator', foreground: '56b6c2' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#495162',
      'editorLineNumber.activeForeground': '#abb2bf',
      'editor.findMatchBackground': '#42557b',
      'editor.findMatchHighlightBackground': '#314365',
    },
  },
};

const MONOKAI: ThemeDefinition = {
  id: 'monokai',
  name: 'Monokai',
  extensionId: 'monokai',
  type: 'dark',
  colors: {
    '--color-background': '#272822',
    '--color-sidebar': '#1e1f1c',
    '--color-activityBar': '#1e1f1c',
    '--color-titleBar': '#1e1f1c',
    '--color-statusBar': '#75715e',
    '--color-tab': '#1e1f1c',
    '--color-tabActive': '#272822',
    '--color-border': '#3e3d32',
    '--color-text': '#f8f8f2',
    '--color-textMuted': '#75715e',
    '--color-accent': '#a6e22e',
    '--color-hover': '#3e3d32',
    '--color-selected': '#49483e',
    '--color-panel': '#1e1f1c',
    '--color-badge': '#a6e22e',
    '--color-button': '#a6e22e',
  },
  monacoTheme: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9e8' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'ae81ff' },
      { token: 'operator', foreground: 'f92672' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
      'editorLineNumber.foreground': '#90908a',
      'editor.findMatchBackground': '#ffe792',
      'editor.findMatchHighlightBackground': '#ffe79266',
    },
  },
};

const GITHUB_LIGHT: ThemeDefinition = {
  id: 'github-light',
  name: 'GitHub Light',
  extensionId: 'github.github-vscode-theme',
  type: 'light',
  colors: {
    '--color-background': '#ffffff',
    '--color-sidebar': '#f6f8fa',
    '--color-activityBar': '#f6f8fa',
    '--color-titleBar': '#f6f8fa',
    '--color-statusBar': '#0969da',
    '--color-tab': '#f6f8fa',
    '--color-tabActive': '#ffffff',
    '--color-border': '#d0d7de',
    '--color-text': '#24292f',
    '--color-textMuted': '#57606a',
    '--color-accent': '#0969da',
    '--color-hover': '#eaeef2',
    '--color-selected': '#ddf4ff',
    '--color-panel': '#f6f8fa',
    '--color-badge': '#0969da',
    '--color-button': '#0969da',
  },
  monacoTheme: {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e' },
      { token: 'string', foreground: '0a3069' },
      { token: 'number', foreground: '0550ae' },
      { token: 'type', foreground: '953800' },
      { token: 'function', foreground: '8250df' },
      { token: 'variable', foreground: '24292f' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#add6ff',
      'editorCursor.foreground': '#0969da',
      'editorLineNumber.foreground': '#8c959f',
    },
  },
};

const NIGHT_OWL: ThemeDefinition = {
  id: 'night-owl',
  name: 'Night Owl',
  extensionId: 'sdras.night-owl',
  type: 'dark',
  colors: {
    '--color-background': '#011627',
    '--color-sidebar': '#010e1a',
    '--color-activityBar': '#010e1a',
    '--color-titleBar': '#010e1a',
    '--color-statusBar': '#010e1a',
    '--color-tab': '#010e1a',
    '--color-tabActive': '#011627',
    '--color-border': '#122d42',
    '--color-text': '#d6deeb',
    '--color-textMuted': '#637777',
    '--color-accent': '#82aaff',
    '--color-hover': '#0d2137',
    '--color-selected': '#1d3b53',
    '--color-panel': '#010e1a',
    '--color-badge': '#82aaff',
    '--color-button': '#82aaff',
  },
  monacoTheme: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '637777', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'ecc48d' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'type', foreground: 'ffcb8b' },
      { token: 'function', foreground: '82aaff' },
      { token: 'variable', foreground: 'addb67' },
      { token: 'constant', foreground: 'ff5874' },
    ],
    colors: {
      'editor.background': '#011627',
      'editor.foreground': '#d6deeb',
      'editor.lineHighlightBackground': '#010e1a',
      'editor.selectionBackground': '#1d3b53',
      'editorCursor.foreground': '#80a4c2',
      'editorLineNumber.foreground': '#4b6479',
    },
  },
};

const DEFAULT_DARK: ThemeDefinition = {
  id: 'default-dark',
  name: 'Default Dark',
  extensionId: '__built-in__',
  type: 'dark',
  colors: {
    '--color-background': '#101112',
    '--color-sidebar': '#181818',
    '--color-activityBar': '#181818',
    '--color-titleBar': '#181818',
    '--color-statusBar': '#181818',
    '--color-tab': '#181818',
    '--color-tabActive': '#101112',
    '--color-border': '#2b2b2b',
    '--color-text': '#f2f2f2',
    '--color-textMuted': '#d6d6d6',
    '--color-accent': '#22a6f2',
    '--color-hover': '#2a2d2e',
    '--color-selected': '#094771',
    '--color-panel': '#1e1e1e',
    '--color-badge': '#007acc',
    '--color-button': '#0e639c',
  },
  monacoTheme: {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#101112',
      'editor.foreground': '#f2f2f2',
    },
  },
};

// ── Theme registry ─────────────────────────────────────────────────────────

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  DEFAULT_DARK,
  ONE_DARK_PRO,
  MONOKAI,
  NIGHT_OWL,
  GITHUB_LIGHT,
];

const THEME_STORAGE_KEY = 'ai-web-ide.activeTheme.v1';

export function getThemeForExtension(extensionId: string): ThemeDefinition | null {
  return BUILT_IN_THEMES.find((t) => t.extensionId === extensionId) ?? null;
}

export function getActiveThemeId(): string {
  return localStorage.getItem(THEME_STORAGE_KEY) ?? 'default-dark';
}

export function getActiveTheme(): ThemeDefinition {
  const id = getActiveThemeId();
  return BUILT_IN_THEMES.find((t) => t.id === id) ?? DEFAULT_DARK;
}

export function applyTheme(theme: ThemeDefinition, monaco?: typeof import('monaco-editor')) {
  // Apply CSS variables to the document root
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(key, value);
  }

  // Set data-theme attribute for color-scheme
  document.documentElement.setAttribute('data-theme', theme.type);

  // Apply Monaco theme if instance is available
  if (monaco) {
    const themeId = `ai-web-ide-${theme.id}`;
    monaco.editor.defineTheme(themeId, theme.monacoTheme);
    monaco.editor.setTheme(themeId);
  }

  // Persist
  localStorage.setItem(THEME_STORAGE_KEY, theme.id);

  // Notify other parts of the app
  window.dispatchEvent(new CustomEvent('ai-web-ide:theme-changed', { detail: theme }));
}

export function applyThemeById(id: string, monaco?: typeof import('monaco-editor')) {
  const theme = BUILT_IN_THEMES.find((t) => t.id === id) ?? DEFAULT_DARK;
  applyTheme(theme, monaco);
}

/** Apply the persisted theme on startup (CSS variables only, no Monaco needed yet) */
export function initializeTheme() {
  const theme = getActiveTheme();
  applyTheme(theme);
}
