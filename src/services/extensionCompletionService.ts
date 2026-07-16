import type * as Monaco from 'monaco-editor';
import { ExtensionItem, getExtensionCapabilities } from '../store/extensionStore';

type CompletionItem = Monaco.languages.CompletionItem;

const EXTENSION_SNIPPETS: Record<string, Array<{ label: string; insertText: string; detail: string; languages?: string[] }>> = {
  'ms-python.python': [
    { label: 'def', insertText: 'def ${1:name}(${2:args}):\n\t${0:pass}', detail: 'Python function', languages: ['python'] },
    { label: 'class', insertText: 'class ${1:Name}:\n\tdef __init__(self${2:, args}):\n\t\t${0:pass}', detail: 'Python class', languages: ['python'] },
    { label: 'ifmain', insertText: 'if __name__ == "__main__":\n\t${0:main()}', detail: 'Python main guard', languages: ['python'] },
    { label: 'print', insertText: 'print(${0:value})', detail: 'Python print', languages: ['python'] },
    { label: 'listcomp', insertText: '[${1:x} for ${2:x} in ${3:iterable}]', detail: 'List comprehension', languages: ['python'] },
  ],
  'ms-vscode.vscode-typescript-next': [
    { label: 'interface', insertText: 'interface ${1:Name} {\n\t${0}\n}', detail: 'TypeScript interface', languages: ['typescript', 'typescriptreact', 'tsx'] },
    { label: 'type', insertText: 'type ${1:Name} = ${0};', detail: 'TypeScript type alias', languages: ['typescript', 'typescriptreact', 'tsx'] },
    { label: 'enum', insertText: 'enum ${1:Name} {\n\t${0}\n}', detail: 'TypeScript enum', languages: ['typescript', 'typescriptreact', 'tsx'] },
  ],
  'bradlc.vscode-tailwindcss': [
    { label: 'flex', insertText: 'flex items-center justify-center', detail: 'Tailwind flex', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: 'grid', insertText: 'grid grid-cols-${1:2} gap-${2:4}', detail: 'Tailwind grid', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: 'p-4', insertText: 'p-4', detail: 'Tailwind padding', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx', 'css'] },
    { label: 'text-sm', insertText: 'text-sm text-gray-500', detail: 'Tailwind text', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: 'rounded', insertText: 'rounded-lg border border-gray-200', detail: 'Tailwind rounded', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: 'dark:', insertText: 'dark:bg-gray-900 dark:text-white', detail: 'Tailwind dark mode', languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
  ],
  'dbaeumer.vscode-eslint': [
    { label: 'eslint-disable', insertText: '/* eslint-disable ${0:rule} */', detail: 'Disable ESLint rule', languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: 'eslint-disable-next-line', insertText: '// eslint-disable-next-line ${0:rule}', detail: 'Disable next line', languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
  ],
  'esbenp.prettier-vscode': [
    { label: 'prettier-ignore', insertText: '// prettier-ignore', detail: 'Prettier ignore', languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx', 'css', 'html'] },
  ],
  'redhat.java': [
    { label: 'sout', insertText: 'System.out.println(${0:value});', detail: 'Java println', languages: ['java'] },
    { label: 'psvm', insertText: 'public static void main(String[] args) {\n\t${0}\n}', detail: 'Java main', languages: ['java'] },
  ],
  'golang.go': [
    { label: 'errcheck', insertText: 'if err != nil {\n\treturn ${0:err}\n}', detail: 'Go error check', languages: ['go'] },
    { label: 'fmt.Println', insertText: 'fmt.Println(${0:value})', detail: 'Go print', languages: ['go'] },
  ],
  'rust-lang.rust-analyzer': [
    { label: 'unwrap', insertText: '.unwrap()', detail: 'Rust unwrap', languages: ['rust'] },
    { label: 'println!', insertText: 'println!("${1:{}}", ${2:value});', detail: 'Rust println', languages: ['rust'] },
  ],
  'christian-kohler.path-intellisense': [
    { label: './', insertText: './${1:path}', detail: 'Relative path', languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
    { label: '../', insertText: '../${1:path}', detail: 'Parent path', languages: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx'] },
  ],
  'ms-azuretools.vscode-docker': [
    { label: 'FROM', insertText: 'FROM ${1:node:20-alpine}\nWORKDIR /app\nCOPY . .\nRUN ${2:npm install}\nCMD ["${3:npm}", "start"]', detail: 'Dockerfile', languages: ['dockerfile', 'plaintext'] },
  ],
};

const EXTENSION_KEYWORDS: Record<string, { keywords: string[]; languages: string[] }> = {
  'ms-python.python': {
    keywords: ['numpy', 'pandas', 'matplotlib', 'asyncio', 'dataclass', 'typing', 'Optional', 'List', 'Dict', 'self', 'super', '__init__', '__str__', 'staticmethod', 'classmethod'],
    languages: ['python'],
  },
  'bradlc.vscode-tailwindcss': {
    keywords: ['container', 'mx-auto', 'hidden', 'block', 'inline-flex', 'space-x-2', 'hover:', 'focus:', 'transition', 'shadow-md'],
    languages: ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx', 'css'],
  },
};

export function getExtensionCompletionItems(
  monaco: typeof Monaco,
  installed: ExtensionItem[],
  languageId: string,
  range: Monaco.IRange
): CompletionItem[] {
  const kind = monaco.languages.CompletionItemKind;
  const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  for (const ext of installed) {
    const snippets = EXTENSION_SNIPPETS[ext.id] || [];
    for (const snippet of snippets) {
      if (snippet.languages && !snippet.languages.includes(languageId)) continue;
      const key = `${ext.id}:${snippet.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        label: snippet.label,
        kind: kind.Snippet,
        insertText: snippet.insertText,
        insertTextRules: snippetRule,
        detail: `${ext.displayName} — ${snippet.detail}`,
        sortText: `0_${snippet.label}`,
        range,
      });
    }

    const keywordSet = EXTENSION_KEYWORDS[ext.id];
    if (keywordSet?.languages.includes(languageId)) {
      for (const word of keywordSet.keywords) {
        const key = `${ext.id}:kw:${word}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          label: word,
          kind: kind.Keyword,
          insertText: word,
          detail: ext.displayName,
          sortText: `1_${word}`,
          range,
        });
      }
    }

    const caps = getExtensionCapabilities(ext);
    if (caps.includes('Language Support')) {
      const extLang = inferLanguageFromExtension(ext);
      if (extLang && matchesLanguage(extLang, languageId)) {
        items.push({
          label: ext.displayName,
          kind: kind.Module,
          insertText: '',
          detail: `Active: ${ext.displayName} v${ext.version}`,
          documentation: ext.description,
          sortText: `2_${ext.displayName}`,
          range,
        });
      }
    }
  }

  return items;
}

function inferLanguageFromExtension(ext: ExtensionItem): string | null {
  const haystack = `${ext.id} ${ext.displayName}`.toLowerCase();
  if (haystack.includes('python')) return 'python';
  if (haystack.includes('java') && !haystack.includes('javascript')) return 'java';
  if (haystack.includes('typescript') || haystack.includes('javascript')) return 'typescript';
  if (haystack.includes('rust')) return 'rust';
  if (haystack.includes('go') && !haystack.includes('logo')) return 'go';
  if (haystack.includes('tailwind') || haystack.includes('css')) return 'css';
  if (haystack.includes('docker')) return 'dockerfile';
  return null;
}

function matchesLanguage(extLang: string, languageId: string): boolean {
  if (extLang === languageId) return true;
  if (extLang === 'typescript' && ['typescript', 'typescriptreact', 'tsx', 'javascript', 'javascriptreact', 'jsx'].includes(languageId)) return true;
  return false;
}
