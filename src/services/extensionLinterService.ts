/**
 * Extension Linter Service
 * Provides simulated ESLint-style markers in Monaco when the
 * ESLint or StyleLint extensions are installed.
 */
import type * as Monaco from 'monaco-editor';
import { ExtensionItem } from '../store/extensionStore';

type MarkerData = Monaco.editor.IMarkerData;

// ── ESLint-style rules ──────────────────────────────────────────────────────

interface LintRule {
  id: string;
  check: (line: string, lineIndex: number, lines: string[]) => LintViolation | null;
  severity: Monaco.MarkerSeverity;
}

interface LintViolation {
  message: string;
  startColumn: number;
  endColumn: number;
  code: string;
}

const JS_TS_RULES: LintRule[] = [
  {
    id: 'no-var',
    severity: 2 as Monaco.MarkerSeverity, // Warning
    check: (line, lineIndex) => {
      const match = /\bvar\s+(\w+)/.exec(line);
      if (!match) return null;
      return {
        message: "Unexpected 'var'. Use 'const' or 'let' instead. (no-var)",
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
        code: 'no-var',
      };
    },
  },
  {
    id: 'no-console',
    severity: 4 as Monaco.MarkerSeverity, // Hint
    check: (line) => {
      const match = /\bconsole\.(log|warn|error|info|debug)\s*\(/.exec(line);
      if (!match) return null;
      return {
        message: `Unexpected console statement. (no-console)`,
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
        code: 'no-console',
      };
    },
  },
  {
    id: 'eqeqeq',
    severity: 2 as Monaco.MarkerSeverity,
    check: (line) => {
      const match = /[^=!<>]==[^=]|[^=!<>]!=[^=]/.exec(line);
      if (!match) return null;
      return {
        message: "Expected '===' and instead saw '=='. Use strict equality. (eqeqeq)",
        startColumn: match.index + 2,
        endColumn: match.index + match[0].length,
        code: 'eqeqeq',
      };
    },
  },
  {
    id: 'no-unused-vars',
    severity: 2 as Monaco.MarkerSeverity,
    check: (line, lineIndex, lines) => {
      const match = /(?:const|let|var)\s+(\w+)\s*=/.exec(line);
      if (!match) return null;
      const varName = match[1];
      // Simple heuristic: declared but never referenced elsewhere
      const usedElsewhere = lines.some(
        (l, i) => i !== lineIndex && new RegExp(`\\b${varName}\\b`).test(l)
      );
      if (usedElsewhere) return null;
      return {
        message: `'${varName}' is assigned a value but never used. (no-unused-vars)`,
        startColumn: match.index + match[0].indexOf(varName) + 1,
        endColumn: match.index + match[0].indexOf(varName) + varName.length + 1,
        code: 'no-unused-vars',
      };
    },
  },
];

const PYTHON_RULES: LintRule[] = [
  {
    id: 'E302',
    severity: 2 as Monaco.MarkerSeverity,
    check: (line, lineIndex, lines) => {
      if (!/^(def |class )/.test(line)) return null;
      if (lineIndex === 0) return null;
      const prevLine = lines[lineIndex - 1]?.trim();
      const prevPrevLine = lines[lineIndex - 2]?.trim();
      if (prevLine === '' && prevPrevLine === '') return null;
      return {
        message: 'E302 expected 2 blank lines, found 1',
        startColumn: 1,
        endColumn: line.length + 1,
        code: 'E302',
      };
    },
  },
  {
    id: 'W291',
    severity: 4 as Monaco.MarkerSeverity,
    check: (line) => {
      if (!/\s+$/.test(line)) return null;
      return {
        message: 'W291 trailing whitespace',
        startColumn: line.trimEnd().length + 1,
        endColumn: line.length + 1,
        code: 'W291',
      };
    },
  },
];

// ── Linter core ─────────────────────────────────────────────────────────────

const ESLINT_IDS = new Set(['dbaeumer.vscode-eslint', 'ms-python.python']);
const JS_LANGUAGES = new Set(['javascript', 'typescript', 'javascriptreact', 'typescriptreact']);

let _disposable: { dispose(): void } | null = null;
let _currentModel: Monaco.editor.ITextModel | null = null;

export function activateLinter(
  monaco: typeof import('monaco-editor'),
  installed: ExtensionItem[]
) {
  const hasEslint = installed.some((e) => ESLINT_IDS.has(e.id));
  if (!hasEslint) {
    deactivateLinter(monaco);
    return;
  }

  // Lint current model immediately
  const activeModel = monaco.editor.getEditors()[0]?.getModel();
  if (activeModel) lintModel(monaco, activeModel);

  // Set up listener for future model changes using onDidCreateEditor
  _disposable?.dispose();
  _disposable = monaco.editor.onDidCreateEditor((editor) => {
    const model = editor.getModel();
    if (!model) return;
    _currentModel = model;
    lintModel(monaco, model);

    // Re-lint on content change (debounced)
    let timer: ReturnType<typeof setTimeout>;
    model.onDidChangeContent(() => {
      clearTimeout(timer);
      timer = setTimeout(() => lintModel(monaco, model), 600);
    });

    // Also re-lint when model changes on an existing editor
    editor.onDidChangeModel((e) => {
      const newModel = editor.getModel();
      if (!newModel) return;
      _currentModel = newModel;
      lintModel(monaco, newModel);
    });
  });
}

export function deactivateLinter(monaco: typeof import('monaco-editor')) {
  _disposable?.dispose();
  _disposable = null;
  if (_currentModel) {
    monaco.editor.setModelMarkers(_currentModel, 'eslint', []);
  }
  // Clear all ESLint markers from all models
  monaco.editor.getModels().forEach((m) => {
    monaco.editor.setModelMarkers(m, 'eslint', []);
  });
}

function lintModel(monaco: typeof import('monaco-editor'), model: Monaco.editor.ITextModel) {
  const language = model.getLanguageId();
  const text = model.getValue();
  const lines = text.split('\n');

  const markers: MarkerData[] = [];
  const rules: LintRule[] = JS_LANGUAGES.has(language) ? JS_TS_RULES : language === 'python' ? PYTHON_RULES : [];

  for (let i = 0; i < lines.length; i++) {
    for (const rule of rules) {
      const violation = rule.check(lines[i], i, lines);
      if (!violation) continue;
      markers.push({
        severity: rule.severity,
        message: violation.message,
        startLineNumber: i + 1,
        startColumn: violation.startColumn,
        endLineNumber: i + 1,
        endColumn: violation.endColumn,
        source: 'ESLint',
        code: violation.code,
      });
    }
  }

  monaco.editor.setModelMarkers(model, 'eslint', markers);
}
