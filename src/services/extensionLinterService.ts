/**
 * Extension Linter Service
 * Registers linter providers from installed extensions with Monaco
 */
import type * as Monaco from 'monaco-editor';
import { ExtensionItem, getExtensionCapabilities } from '../store/extensionStore';

export function activateLinter(
  monaco: typeof Monaco,
  installed: ExtensionItem[]
) {
  const linters = installed.filter((ext) =>
    getExtensionCapabilities(ext).includes('Linter')
  );

  if (!linters.length) return;

  // Languages that support linting
  const languages = ['typescript', 'javascript', 'jsx', 'tsx', 'python', 'json'];

  languages.forEach((lang) => {
    monaco.languages.registerCodeActionProvider(lang, {
      provideCodeActions: async (model, range, context, token) => {
        if (token.isCancellationRequested) {
          return { actions: [], dispose: () => {} };
        }

        const code = model.getValue();
        const issues = lintCode(code, lang);

        const actions = issues.map((issue) => ({
          title: issue.message,
          kind: monaco.languages.CodeActionKind.QuickFix,
          diagnostics: [issue],
          isPreferred: false,
        }));

        return { actions, dispose: () => {} };
      },
    });

    // Also register as code action provider for diagnostics
    const disposable = monaco.languages.onLanguage(lang, () => {
      // Register diagnostics
      const diagnosticCollection: Map<string, Monaco.languages.IMarkerData[]> =
        new Map();

      // This would need to be called whenever the model changes
      // For now, we'll use the code action provider above
    });
  });
}

function lintCode(code: string, language: string): Monaco.languages.IMarkerData[] {
  const issues: Monaco.languages.IMarkerData[] = [];

  if (['typescript', 'javascript', 'jsx', 'tsx'].includes(language)) {
    lintJavaScript(code, issues);
  } else if (language === 'python') {
    lintPython(code, issues);
  } else if (language === 'json') {
    lintJSON(code, issues);
  }

  return issues;
}

function lintJavaScript(
  code: string,
  issues: Monaco.languages.IMarkerData[]
) {
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const lineStart = code.indexOf(line);

    // Check for console.log in production-like code
    if (/console\.(log|warn|error|info|debug)/.test(line)) {
      const match = line.match(/console\.(log|warn|error|info|debug)/);
      if (match) {
        const column = line.indexOf(match[0]);
        issues.push({
          startLineNumber: lineNum,
          startColumn: column + 1,
          endLineNumber: lineNum,
          endColumn: column + match[0].length + 1,
          message: `Unexpected console statement: ${match[0]}`,
          severity: 2, // Warning
          code: 'no-console',
        });
      }
    }

    // Check for debugger statements
    if (/\bdebugger\b/.test(line)) {
      const column = line.indexOf('debugger');
      issues.push({
        startLineNumber: lineNum,
        startColumn: column + 1,
        endLineNumber: lineNum,
        endColumn: column + 'debugger'.length + 1,
        message: 'Debugger statement found',
        severity: 1, // Error
        code: 'no-debugger',
      });
    }

    // Check for missing semicolons (basic)
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith('(') &&
      !trimmed.endsWith('[') &&
      !trimmed.startsWith('//')
    ) {
      if (/^(const|let|var|return|throw|import|export)\s/.test(trimmed)) {
        issues.push({
          startLineNumber: lineNum,
          startColumn: line.length,
          endLineNumber: lineNum,
          endColumn: line.length + 1,
          message: 'Missing semicolon',
          severity: 3, // Info
          code: 'missing-semicolon',
        });
      }
    }

    // Check for unused variables (basic pattern)
    const unusedMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
    if (unusedMatch) {
      const varName = unusedMatch[1];
      // Simple check: if variable is declared but not used in remaining code
      const afterDeclaration = code.substring(lineStart + line.length);
      if (!new RegExp(`\\b${varName}\\b`).test(afterDeclaration)) {
        const column = line.indexOf(varName);
        issues.push({
          startLineNumber: lineNum,
          startColumn: column + 1,
          endLineNumber: lineNum,
          endColumn: column + varName.length + 1,
          message: `Variable '${varName}' is assigned but never used`,
          severity: 2, // Warning
          code: 'no-unused-vars',
        });
      }
    }
  });
}

function lintPython(
  code: string,
  issues: Monaco.languages.IMarkerData[]
) {
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for print statements (should use logging)
    if (/\bprint\s*\(/.test(line)) {
      const column = line.indexOf('print');
      issues.push({
        startLineNumber: lineNum,
        startColumn: column + 1,
        endLineNumber: lineNum,
        endColumn: column + 'print'.length + 1,
        message: 'Use logging instead of print',
        severity: 2, // Warning
        code: 'use-logging',
      });
    }

    // Check for missing docstrings
    const funcMatch = line.match(/^def\s+(\w+)/);
    if (funcMatch) {
      const nextLine = lines[index + 1];
      if (
        nextLine &&
        !nextLine.trim().startsWith('"""') &&
        !nextLine.trim().startsWith("'''")
      ) {
        issues.push({
          startLineNumber: lineNum,
          startColumn: 1,
          endLineNumber: lineNum,
          endColumn: line.length + 1,
          message: 'Missing docstring',
          severity: 3, // Info
          code: 'missing-docstring',
        });
      }
    }

    // Check for multiple statements on one line
    if (line.includes(';')) {
      const column = line.indexOf(';');
      issues.push({
        startLineNumber: lineNum,
        startColumn: column + 1,
        endLineNumber: lineNum,
        endColumn: column + 2,
        message: 'Multiple statements on one line',
        severity: 2, // Warning
        code: 'multiple-statements',
      });
    }
  });
}

function lintJSON(
  code: string,
  issues: Monaco.languages.IMarkerData[]
) {
  try {
    JSON.parse(code);
  } catch (error) {
    const errorMsg = String(error);
    const match = errorMsg.match(/position\s(\d+)/);
    if (match) {
      const position = parseInt(match[1]);
      const lineNum =
        code.substring(0, position).split('\n').length;
      const lineStart = code.lastIndexOf('\n', position) + 1;
      const column = position - lineStart + 1;

      issues.push({
        startLineNumber: lineNum,
        startColumn: column,
        endLineNumber: lineNum,
        endColumn: column + 1,
        message: `JSON Error: ${errorMsg}`,
        severity: 1, // Error
        code: 'json-syntax-error',
      });
    }
  }
}
