import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, File, Settings, Terminal, Bot, GitBranch, X, Puzzle, Palette, Code2, Wrench } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { getLanguageFromExtension } from '../../utils/fileHelpers';
import { fileService } from '../../services/fileService';
import { browserFileCache } from '../../services/browserFileCache';
import { FileNode } from '../../types/file.types';
import {
  getRegisteredCommands,
  onCommandsChanged,
  ExtensionCommand,
} from '../../services/extensionRuntime';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  category: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Theme: <Palette size={13} />,
  Formatting: <Code2 size={13} />,
  Linting: <Wrench size={13} />,
  Language: <Code2 size={13} />,
  Extensions: <Puzzle size={13} />,
  Git: <GitBranch size={13} />,
  View: <File size={13} />,
  Terminal: <Terminal size={13} />,
  Preferences: <Settings size={13} />,
  AI: <Bot size={13} />,
  Files: <File size={13} />,
};

export default function CommandPalette() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [extensionCommands, setExtensionCommands] = useState<ExtensionCommand[]>(() => getRegisteredCommands());
  const {
    setCommandPaletteOpen,
    setActiveSidebarPanel,
    setBottomPanelVisible,
    setActiveBottomPanel,
    addNotification,
    setRightPanelVisible,
  } = useUIStore();
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

  // Subscribe to extension command changes
  useEffect(() => {
    const unsubscribe = onCommandsChanged(() => {
      setExtensionCommands(getRegisteredCommands());
    });
    return unsubscribe;
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
  const runEditorCommand = (command: string) => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:editor-command', { detail: command }));
    setCommandPaletteOpen(false);
  };

  const builtInCommands: Command[] = [
    {
      id: 'explorer', label: 'View: Show Explorer', category: 'View',
      icon: <File size={13} />,
      action: () => { setActiveSidebarPanel('explorer'); setCommandPaletteOpen(false); },
    },
    {
      id: 'search', label: 'View: Show Search', category: 'View',
      icon: <Search size={13} />,
      action: () => { setActiveSidebarPanel('search'); setCommandPaletteOpen(false); },
    },
    {
      id: 'extensions', label: 'View: Show Extensions', category: 'View',
      icon: <Puzzle size={13} />,
      action: () => { setActiveSidebarPanel('extensions'); setCommandPaletteOpen(false); },
    },
    {
      id: 'terminal', label: 'Terminal: Create New Terminal', category: 'Terminal',
      icon: <Terminal size={13} />,
      action: () => {
        setActiveBottomPanel('terminal');
        setBottomPanelVisible(true);
        window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { action: 'new' } }));
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ai', label: 'AI: Open Pair Programmer', category: 'AI',
      icon: <Bot size={13} />,
      action: () => { setRightPanelVisible(true); setCommandPaletteOpen(false); },
    },
    {
      id: 'git', label: 'View: Show Source Control', category: 'View',
      icon: <GitBranch size={13} />,
      action: () => { setActiveSidebarPanel('git'); setCommandPaletteOpen(false); },
    },
    {
      id: 'settings', label: 'Preferences: Open Settings', category: 'Preferences',
      icon: <Settings size={13} />,
      action: () => {
        openTab({
          id: 'tab-ide-settings',
          fileId: 'ide-settings',
          filePath: '/settings/ide',
          fileName: 'Settings',
          language: 'ide-settings',
          content: '',
          isDirty: false,
          isPreview: false,
          cursorPosition: { line: 1, column: 1 },
        });
        setCommandPaletteOpen(false);
      },
    },
    { id: 'find', label: 'Edit: Find', category: 'Editor', icon: <Search size={13} />, action: () => runEditorCommand('find') },
    { id: 'replace', label: 'Edit: Replace', category: 'Editor', icon: <Search size={13} />, action: () => runEditorCommand('replace') },
    { id: 'go-line', label: 'Go: Go to Line/Column', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('go-to-line') },
    { id: 'go-symbol', label: 'Go: Go to Symbol in Editor', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('go-to-symbol') },
    { id: 'go-definition', label: 'Go: Go to Definition', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('go-to-definition') },
    { id: 'peek-definition', label: 'Go: Peek Definition', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('peek-definition') },
    { id: 'references', label: 'Go: Find References', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('go-to-references') },
    { id: 'implementation', label: 'Go: Go to Implementation', category: 'Navigation', icon: <Code2 size={13} />, action: () => runEditorCommand('go-to-implementation') },
    { id: 'rename', label: 'Refactor: Rename Symbol', category: 'Refactoring', icon: <Wrench size={13} />, action: () => runEditorCommand('rename-symbol') },
    { id: 'quick-fix', label: 'Refactor: Quick Fix', category: 'Refactoring', icon: <Wrench size={13} />, action: () => runEditorCommand('quick-fix') },
    { id: 'refactor', label: 'Refactor: Refactor...', category: 'Refactoring', icon: <Wrench size={13} />, action: () => runEditorCommand('refactor') },
    { id: 'source-action', label: 'Refactor: Source Action...', category: 'Refactoring', icon: <Wrench size={13} />, action: () => runEditorCommand('source-action') },
    { id: 'format-document', label: 'Format: Format Document', category: 'Formatting', icon: <Code2 size={13} />, action: () => runEditorCommand('format-document') },
    { id: 'fold-all', label: 'View: Fold All', category: 'Editor', icon: <Code2 size={13} />, action: () => runEditorCommand('fold-all') },
    { id: 'unfold-all', label: 'View: Unfold All', category: 'Editor', icon: <Code2 size={13} />, action: () => runEditorCommand('unfold-all') },
    { id: 'next-problem', label: 'Problems: Go to Next Problem', category: 'Diagnostics', icon: <Wrench size={13} />, action: () => runEditorCommand('next-problem') },
    { id: 'previous-problem', label: 'Problems: Go to Previous Problem', category: 'Diagnostics', icon: <Wrench size={13} />, action: () => runEditorCommand('previous-problem') },
    { id: 'toggle-breakpoint', label: 'Debug: Toggle Breakpoint', category: 'Debug', icon: <Code2 size={13} />, action: () => runEditorCommand('toggle-breakpoint') },
    { id: 'run-selected-text', label: 'Terminal: Run Selected Text', category: 'Terminal', icon: <Terminal size={13} />, action: () => runEditorCommand('run-selected-text') },
    { id: 'ai-explain', label: 'AI: Explain Selection or File', category: 'AI', icon: <Bot size={13} />, action: () => runEditorCommand('ai-explain') },
    { id: 'ai-generate', label: 'AI: Generate Code', category: 'AI', icon: <Bot size={13} />, action: () => runEditorCommand('ai-generate') },
    // File commands
    ...allFiles.map((file) => ({
      id: `file-${file.id}`,
      label: file.name,
      description: file.path,
      category: 'Files',
      icon: <File size={13} />,
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

  // Convert extension commands to Command shape
  const extCommands: Command[] = useMemo(() => extensionCommands.map((cmd) => ({
    id: `ext-${cmd.id}`,
    label: cmd.label,
    description: `from ${cmd.extensionName}`,
    category: cmd.category,
    icon: CATEGORY_ICONS[cmd.category] ?? <Puzzle size={13} />,
    action: () => {
      cmd.action();
      setCommandPaletteOpen(false);
    },
  })), [extensionCommands]);

  const allCommands = [...builtInCommands, ...extCommands];

  const filtered = useMemo(() => {
    if (!query) return allCommands.slice(0, 12);
    const q = query.toLowerCase();
    return allCommands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, allCommands]);

  // Group by category when no query
  const grouped = useMemo(() => {
    if (query) return null;
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [query, filtered]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-[580px] rounded-xl overflow-hidden shadow-2xl slide-down"
        style={{
          background: '#1a1d1f',
          border: '1px solid #2f3235',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: '#2f3235' }}
        >
          <Search size={15} style={{ color: '#555', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--color-text)' }}
            placeholder="Type a command or search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            {query && (
              <button onClick={() => setQuery('')} style={{ color: '#555' }}>
                <X size={13} />
              </button>
            )}
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: '#252829', color: '#555', border: '1px solid #333', fontFamily: 'inherit' }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: '#555' }}>
              No results for "{query}"
            </div>
          ) : grouped ? (
            Object.entries(grouped).map(([cat, cmds]) => (
              <div key={cat}>
                <div
                  className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#444', letterSpacing: '0.1em' }}
                >
                  {cat}
                </div>
                {cmds.map((cmd) => <CommandRow key={cmd.id} cmd={cmd} />)}
              </div>
            ))
          ) : (
            filtered.map((cmd) => <CommandRow key={cmd.id} cmd={cmd} />)
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-[10px]"
          style={{ borderColor: '#252829', color: '#3a3d40' }}
        >
          <span>↑↓ Navigate</span>
          <span>⏎ Run</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({ cmd }: { cmd: Command }) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/[0.05] transition-colors group"
      onClick={() => void cmd.action()}
    >
      <span style={{ color: '#555', flexShrink: 0 }} className="group-hover:text-[var(--color-accent)] transition-colors">
        {cmd.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px]" style={{ color: 'var(--color-text)' }}>{cmd.label}</div>
        {cmd.description && (
          <div className="text-[10px] truncate mt-0.5" style={{ color: '#444' }}>{cmd.description}</div>
        )}
      </div>
      <span
        className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
        style={{ background: '#252829', color: '#444', fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {cmd.category}
      </span>
    </button>
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
