import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEditorStore } from '../../../store/editorStore';
import { supportsLinting, useExtensionStore } from '../../../store/extensionStore';

export default function ProblemsPanel() {
  const tabs = useEditorStore((state) => state.tabs);
  const installed = useExtensionStore((state) => state.installed);
  const lintingEnabled = supportsLinting(installed);
  const diagnostics = lintingEnabled ? buildDiagnostics(tabs) : [];

  if (!lintingEnabled) {
    return (
      <div className="flex h-full items-center justify-center text-xs" style={{ color: 'var(--color-textMuted)' }}>
        <div className="text-center">
          <Info size={24} className="mx-auto mb-2 opacity-40" />
          <p>Install a linter extension to detect workspace problems.</p>
        </div>
      </div>
    );
  }

  if (!diagnostics.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs" style={{ color: 'var(--color-textMuted)' }}>
        <div className="text-center">
          <AlertCircle size={24} className="mx-auto mb-2 opacity-30" />
          <p>No problems have been detected in the workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      {diagnostics.map((diagnostic) => (
        <div key={`${diagnostic.file}-${diagnostic.line}-${diagnostic.message}`} className="flex items-start gap-2 rounded px-2 py-1 text-xs hover:bg-white/5">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#cca700' }} />
          <div className="min-w-0">
            <div style={{ color: 'var(--color-text)' }}>{diagnostic.message}</div>
            <div className="truncate" style={{ color: 'var(--color-textMuted)' }}>
              {diagnostic.file}:{diagnostic.line}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Diagnostic {
  file: string;
  line: number;
  message: string;
}

function buildDiagnostics(tabs: ReturnType<typeof useEditorStore.getState>['tabs']): Diagnostic[] {
  return tabs.flatMap((tab) => {
    if (!['javascript', 'typescript', 'tsx', 'jsx'].includes(tab.language)) return [];
    return tab.content.split(/\r?\n/).flatMap((line, index) => {
      const diagnostics: Diagnostic[] = [];
      if (/\bconsole\.log\(/.test(line)) {
        diagnostics.push({ file: tab.fileName, line: index + 1, message: 'ESLint: Unexpected console statement.' });
      }
      if (/\bvar\s+/.test(line)) {
        diagnostics.push({ file: tab.fileName, line: index + 1, message: 'ESLint: Prefer let or const instead of var.' });
      }
      return diagnostics;
    });
  });
}
