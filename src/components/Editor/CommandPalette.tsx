import { useState, useEffect, useRef } from 'react';
import { Search, File, Settings, Terminal, Bot, GitBranch, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { getLanguageFromExtension } from '../../utils/fileHelpers';
import { fileService } from '../../services/fileService';
import { browserFileCache } from '../../services/browserFileCache';
import { FileNode } from '../../types/file.types';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  category: string;
}

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCommandPaletteOpen, setActiveSidebarPanel, toggleBottomPanel, addNotification, setRightPanelVisible } = useUIStore();
  const { openTab } = useEditorStore();
  const { fileTree } = useFileStore();

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const flattenFiles = (nodes: typeof fileTree): typeof fileTree => {
    const result: typeof fileTree = [];
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      if (node.children) result.push(...flattenFiles(node.children));
    }
    return result;
  };

  const allFiles = flattenFiles(fileTree);

  const commands: Command[] = [
    {
      id: 'explorer', label: 'View: Show Explorer', category: 'View',
      icon: <File size={14} />,
      action: () => { setActiveSidebarPanel('explorer'); setCommandPaletteOpen(false); },
    },
    {
      id: 'search', label: 'View: Show Search', category: 'View',
      icon: <Search size={14} />,
      action: () => { setActiveSidebarPanel('search'); setCommandPaletteOpen(false); },
    },
    {
      id: 'terminal', label: 'Terminal: Create New Terminal', category: 'Terminal',
      icon: <Terminal size={14} />,
      action: () => { toggleBottomPanel(); setCommandPaletteOpen(false); },
    },
    {
      id: 'ai', label: 'AI: Open Pair Programmer', category: 'AI',
      icon: <Bot size={14} />,
      action: () => { setRightPanelVisible(true); setCommandPaletteOpen(false); },
    },
    {
      id: 'git', label: 'View: Show Source Control', category: 'View',
      icon: <GitBranch size={14} />,
      action: () => { setActiveSidebarPanel('git'); setCommandPaletteOpen(false); },
    },
    {
      id: 'settings', label: 'Preferences: Open Settings', category: 'Preferences',
      icon: <Settings size={14} />,
      action: () => { addNotification({ type: 'info', message: 'Settings panel coming soon!' }); setCommandPaletteOpen(false); },
    },
    // File commands
    ...allFiles.map(file => ({
      id: `file-${file.id}`,
      label: file.name,
      description: file.path,
      category: 'Files',
      icon: <File size={14} />,
      action: async () => {
        const language = getLanguageFromExtension(file.name);
        const content = await readFileContent(file, language);
        openTab({
          id: `tab-${file.id}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          language,
          content,
          isDirty: false,
          isPreview: false,
          cursorPosition: { line: 1, column: 1 },
        });
        setCommandPaletteOpen(false);
      },
    })),
  ];

  const filtered = query
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands.slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg overflow-hidden shadow-2xl"
        style={{
          background: '#252526',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-textMuted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
            placeholder="Type a command or search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--color-textMuted)' }}>
              <X size={14} />
            </button>
          )}
          <kbd className="text-xxs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-input)', color: 'var(--color-textMuted)', border: '1px solid var(--color-border)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-textMuted)' }}>
              No results found for "{query}"
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => void cmd.action()}
              >
                <span style={{ color: 'var(--color-textMuted)' }}>{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ color: 'var(--color-text)' }}>{cmd.label}</div>
                  {cmd.description && (
                    <div className="text-xxs truncate" style={{ color: 'var(--color-textMuted)' }}>{cmd.description}</div>
                  )}
                </div>
                <span className="text-xxs flex-shrink-0" style={{ color: 'var(--color-textMuted)' }}>{cmd.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

async function readFileContent(file: FileNode, language: string) {
  const browserContent = await browserFileCache.read(file.path);
  if (browserContent !== null) return browserContent;

  try {
    const result = await fileService.readFile(file.path);
    return result.content;
  } catch {
    return getDefaultContent(file.name, language);
  }
}

function getDefaultContent(filename: string, language: string) {
  const defaults: Record<string, string> = {
    typescript: `// ${filename}\n\nexport {};\n`,
    javascript: `// ${filename}\n\n`,
    java: `public class ${filename.replace('.java', '')} {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n`,
    python: `# ${filename}\n\n`,
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
    css: `/* ${filename} */\n\n`,
    json: `{\n  \n}\n`,
    markdown: `# ${filename.replace('.md', '')}\n\n`,
    plaintext: '',
  };
  return defaults[language] || `// ${filename}\n`;
}
