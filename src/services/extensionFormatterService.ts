/**
 * Extension Formatter Service
 * Provides code formatting when Prettier (or other formatter extensions) are installed.
 * Uses Monaco's built-in formatter enhanced with extension-specific rules.
 */
import type * as Monaco from 'monaco-editor';
import { ExtensionItem } from '../store/extensionStore';

const PRETTIER_EXTENSION_IDS = new Set(['esbenp.prettier-vscode']);
const SUPPORTED_LANGUAGES = new Set([
  'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
  'json', 'html', 'css', 'scss', 'less', 'markdown', 'yaml',
]);

let _formatCommandRegistered = false;

/**
 * Activate formatter when Prettier extension is installed.
 * Registers a Format Document command that applies Prettier-style formatting.
 */
export function activateFormatter(
  monaco: typeof import('monaco-editor'),
  installed: ExtensionItem[]
): void {
  const hasPrettier = installed.some((e) => PRETTIER_EXTENSION_IDS.has(e.id));
  if (!hasPrettier || _formatCommandRegistered) return;

  _formatCommandRegistered = true;

  // Register a document formatting provider for all supported languages
  for (const languageId of SUPPORTED_LANGUAGES) {
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model) {
        const text = model.getValue();
        const formatted = prettierFormat(text, languageId);
        if (formatted === text) return [];

        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });
  }
}

export function deactivateFormatter(): void {
  _formatCommandRegistered = false;
  // Disposables are managed by Monaco's GC when providers are overridden
}

// ── Prettier-style formatting rules ─────────────────────────────────────────

function prettierFormat(text: string, languageId: string): string {
  try {
    if (languageId === 'json') return formatJson(text);
    if (languageId === 'css' || languageId === 'scss' || languageId === 'less') return formatCss(text);
    if (languageId === 'html') return formatHtml(text);
    if (JS_LANGUAGES.has(languageId)) return formatJs(text);
    if (languageId === 'markdown') return formatMarkdown(text);
    return text;
  } catch {
    return text;
  }
}

const JS_LANGUAGES = new Set(['javascript', 'typescript', 'javascriptreact', 'typescriptreact']);

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2) + '\n';
  } catch {
    return text;
  }
}

function formatJs(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let indentLevel = 0;
  const indentStr = '  '; // 2-space indent (Prettier default)

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) { result.push(''); continue; }

    // Decrease indent before closing brackets
    if (/^[}\])]/.test(line)) indentLevel = Math.max(0, indentLevel - 1);

    // Enforce single quotes (Prettier default)
    const formatted = line
      .replace(/"/g, (m, offset, str) => {
        // Don't replace inside template literals or JSX attributes
        if (isInsideTemplateLiteral(str, offset)) return m;
        return "'";
      })
      // Enforce semicolons at end of statements
      .replace(/([^{};,\(\)\[\]//])\s*$/, (m, p1) => {
        if (/^(if|else|for|while|function|class|import|export|\/\/)/.test(line)) return m;
        return p1 + ';';
      });

    result.push(indentStr.repeat(indentLevel) + formatted);

    // Increase indent after opening brackets
    if (/[{(\[]$/.test(line.replace(/\/\/.*$/, ''))) indentLevel++;
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function formatCss(text: string): string {
  // Ensure each declaration is on its own line and properly indented
  return text
    .replace(/\{/g, ' {\n  ')
    .replace(/;(?!\s*\n)/g, ';\n  ')
    .replace(/\}/g, '\n}\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function formatHtml(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let indentLevel = 0;
  const indentStr = '  ';
  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { result.push(''); continue; }

    const closingMatch = /^<\/([a-z][a-z0-9]*)/i.exec(line);
    if (closingMatch) indentLevel = Math.max(0, indentLevel - 1);

    result.push(indentStr.repeat(indentLevel) + line);

    const openingMatch = /^<([a-z][a-z0-9]*)/i.exec(line);
    if (openingMatch && !voidElements.has(openingMatch[1].toLowerCase()) && !line.endsWith('/>') && !closingMatch) {
      indentLevel++;
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function formatMarkdown(text: string): string {
  // Ensure blank lines around headings and code blocks
  return text
    .replace(/\n(#{1,6} )/g, '\n\n$1')
    .replace(/(#{1,6} .+)\n(?!\n)/g, '$1\n\n')
    .replace(/```/g, '\n```')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim() + '\n';
}

function isInsideTemplateLiteral(str: string, offset: number): boolean {
  let inTemplate = false;
  for (let i = 0; i < offset; i++) {
    if (str[i] === '`') inTemplate = !inTemplate;
  }
  return inTemplate;
}
