/**
 * Extension Formatter Service
 * Registers formatter providers from installed extensions with Monaco
 */
import type * as Monaco from 'monaco-editor';
import { ExtensionItem, getExtensionCapabilities } from '../store/extensionStore';

export function activateFormatter(
  monaco: typeof Monaco,
  installed: ExtensionItem[]
) {
  const formatters = installed.filter((ext) =>
    getExtensionCapabilities(ext).includes('Formatter')
  );

  if (!formatters.length) return;

  // Languages that support formatting
  const languages = [
    'typescript',
    'javascript',
    'jsx',
    'tsx',
    'json',
    'html',
    'css',
    'scss',
    'python',
  ];

  languages.forEach((lang) => {
    monaco.languages.registerDocumentFormattingEditProvider(lang, {
      provideDocumentFormattingEdits: async (model, options, token) => {
        if (token.isCancellationRequested) return [];

        const code = model.getValue();
        const formatted = formatCode(code, lang, options);

        if (formatted === code) return [];

        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });
  });
}

function formatCode(
  code: string,
  language: string,
  options: any
): string {
  try {
    // JSON formatting
    if (language === 'json') {
      const parsed = JSON.parse(code);
      const tabSize = options.tabSize || 2;
      const formatted = JSON.stringify(parsed, null, tabSize);
      return formatted + (code.endsWith('\n') ? '\n' : '');
    }

    // Prettier-like formatting for JS/TS/JSX/TSX
    if (
      ['typescript', 'javascript', 'jsx', 'tsx'].includes(language)
    ) {
      return formatJavaScript(code, options);
    }

    // HTML formatting
    if (language === 'html') {
      return formatHTML(code, options);
    }

    // CSS/SCSS formatting
    if (['css', 'scss'].includes(language)) {
      return formatCSS(code, options);
    }

    // Python formatting
    if (language === 'python') {
      return formatPython(code, options);
    }

    // Fallback: basic formatting
    return formatBasic(code, options);
  } catch (error) {
    console.error('[Formatter]', error);
    return code;
  }
}

function formatJavaScript(code: string, options: any): string {
  const tabSize = options.tabSize || 2;
  const useTabs = options.useTabs || false;
  const indent = useTabs ? '\t' : ' '.repeat(tabSize);

  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n');

  // Split into lines and process
  const lines = result.split('\n');
  let indentLevel = 0;
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      formatted.push('');
      continue;
    }

    // Decrease indent for closing braces
    if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add the line with proper indentation
    formatted.push(indent.repeat(indentLevel) + trimmed);

    // Increase indent for opening braces
    const openCount = (trimmed.match(/[{\[(/]/g) || []).length;
    const closeCount = (trimmed.match(/[}\])]/g) || []).length;
    indentLevel += openCount - closeCount;
  }

  result = formatted.join('\n');

  // Ensure file ends with newline
  if (result && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

function formatHTML(code: string, options: any): string {
  const tabSize = options.tabSize || 2;
  const indent = ' '.repeat(tabSize);
  let result = code.replace(/\r\n/g, '\n');

  const lines = result.split('\n');
  let indentLevel = 0;
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Self-closing tags
    if (/\/?>\s*$/.test(trimmed)) {
      if (trimmed.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      formatted.push(indent.repeat(indentLevel) + trimmed);
      if (!trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
        indentLevel++;
      }
    } else {
      formatted.push(indent.repeat(indentLevel) + trimmed);
    }
  }

  result = formatted.join('\n');
  if (result && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

function formatCSS(code: string, options: any): string {
  let result = code.replace(/\r\n/g, '\n');

  // Remove extra spaces
  result = result.replace(/\s*{\s*/g, ' {\n');
  result = result.replace(/\s*}\s*/g, '\n}\n');
  result = result.replace(/\s*;\s*/g, ';\n');
  result = result.replace(/,\s*/g, ',\n');

  // Trim lines
  result = result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  if (result && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

function formatPython(code: string, options: any): string {
  let result = code.replace(/\r\n/g, '\n');

  // Normalize indentation
  const lines = result.split('\n');
  const formatted = lines.map((line) => {
    if (!line.trim()) return '';
    const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
    const normalized = Math.floor(leadingSpaces / 4) * 4;
    return ' '.repeat(normalized) + line.trim();
  });

  result = formatted.join('\n');

  if (result && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

function formatBasic(code: string, options: any): string {
  let result = code.replace(/\r\n/g, '\n');

  // Trim trailing whitespace from each line
  result = result
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n');

  // Ensure file ends with newline
  if (result && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}
