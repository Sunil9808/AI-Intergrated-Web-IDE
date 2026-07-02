export const APP_NAME = 'AI Web IDE';
export const APP_VERSION = '1.0.0';

export const EDITOR_DEFAULTS = {
  FONT_SIZE: 14,
  TAB_SIZE: 2,
  LINE_HEIGHT: 1.5,
  WORD_WRAP: false,
  MINIMAP: true,
};

export const SIDEBAR_MIN_WIDTH = 150;
export const SIDEBAR_MAX_WIDTH = 600;
export const SIDEBAR_DEFAULT_WIDTH = 240;

export const BOTTOM_PANEL_MIN_HEIGHT = 100;
export const BOTTOM_PANEL_MAX_HEIGHT = 600;
export const BOTTOM_PANEL_DEFAULT_HEIGHT = 250;

export const FILE_ICONS: Record<string, string> = {
  ts: '🔷', tsx: '🔷', js: '🟡', jsx: '🟡',
  py: '🐍', rb: '💎', java: '☕', cpp: '⚙️',
  c: '⚙️', cs: '#️⃣', go: '🔵', rs: '🦀',
  php: '🐘', swift: '🔶', kt: '🟣', html: '🌐',
  css: '🎨', scss: '🎨', less: '🎨', json: '📦',
  yaml: '📄', yml: '📄', xml: '📄', md: '📝',
  sh: '📟', bash: '📟', sql: '🗄️', dockerfile: '🐳',
  txt: '📄', env: '🔐', gitignore: '🚫', png: '🖼️',
  jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
  pdf: '📑', zip: '📦', folder: '📁', folderOpen: '📂',
};

export const SOCKET_EVENTS = {
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CREATED: 'terminal:created',
  TERMINAL_CLOSED: 'terminal:closed',
  AI_STREAM_START: 'ai:stream:start',
  AI_STREAM_CHUNK: 'ai:stream:chunk',
  AI_STREAM_END: 'ai:stream:end',
  AI_ERROR: 'ai:error',
};

export const AI_COMMANDS = [
  { id: 'explain', label: 'Explain Code', icon: '💡', shortcut: 'Ctrl+Shift+E' },
  { id: 'generate', label: 'Generate Code', icon: '✨', shortcut: 'Ctrl+Shift+G' },
  { id: 'debug', label: 'Debug Error', icon: '🐛', shortcut: 'Ctrl+Shift+D' },
  { id: 'refactor', label: 'Refactor', icon: '🔧', shortcut: 'Ctrl+Shift+R' },
  { id: 'review', label: 'Code Review', icon: '👁️', shortcut: 'Ctrl+Shift+V' },
  { id: 'test', label: 'Generate Tests', icon: '🧪', shortcut: 'Ctrl+Shift+T' },
  { id: 'document', label: 'Add Documentation', icon: '📚', shortcut: 'Ctrl+Shift+C' },
  { id: 'convert', label: 'Convert Language', icon: '🔄', shortcut: 'Ctrl+Shift+L' },
];

export const SUPPORTED_LANGUAGES = [
  'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp',
  'csharp', 'php', 'ruby', 'swift', 'kotlin', 'html', 'css', 'sql',
  'shell', 'json', 'yaml', 'xml', 'markdown',
];
