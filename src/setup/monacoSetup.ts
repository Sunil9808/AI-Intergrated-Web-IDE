import type * as Monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

let monacoSetupComplete = false;

export function setupMonacoEnvironment() {
  if (monacoSetupComplete) return;
  monacoSetupComplete = true;

  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };
}

export async function configureMonacoEditor(monaco: typeof Monaco) {
  const { emmetHTML, emmetCSS } = await import('emmet-monaco-es');

  emmetHTML(monaco, ['html', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx']);
  emmetCSS(monaco, ['css', 'scss', 'less']);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    strict: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    lib: ['es2020', 'dom', 'dom.iterable'],
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    lib: ['es2020', 'dom', 'dom.iterable'],
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  registerLanguageConfigurations(monaco);
}

function registerLanguageConfigurations(monaco: typeof Monaco) {
  const htmlConfig: Monaco.languages.LanguageConfiguration = {
    comments: { blockComment: ['<!--', '-->'] },
    brackets: [['<', '>'], ['{', '}'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '<', close: '>', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '<', close: '>' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    onEnterRules: [
      {
        beforeText: /<(?!(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr))([_a-zA-Z][\w-]*)([^/>]*(?!\/)>)[^<]*$/i,
        afterText: /^<\/([_a-zA-Z][\w-]*)\s*>$/i,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /<(?!(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr))([_a-zA-Z][\w-]*)([^/>]*(?!\/)>)[^<]*$/i,
        action: { indentAction: monaco.languages.IndentAction.Indent },
      },
    ],
  };

  monaco.languages.setLanguageConfiguration('html', htmlConfig);
  monaco.languages.setLanguageConfiguration('javascriptreact', htmlConfig);
  monaco.languages.setLanguageConfiguration('typescriptreact', htmlConfig);
}
