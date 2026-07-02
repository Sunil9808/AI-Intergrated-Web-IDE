export interface EditorTab {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  isDirty: boolean;
  isPreview: boolean;
  cursorPosition: CursorPosition;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

export interface EditorTheme {
  name: string;
  base: 'vs' | 'vs-dark' | 'hc-black';
  rules: EditorTokenRule[];
  colors: Record<string, string>;
}

export interface EditorTokenRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export interface SplitEditorConfig {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  ratio: number;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  formatOnSave: boolean;
  formatOnPaste: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  theme: string;
  cursorStyle: string;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
}
