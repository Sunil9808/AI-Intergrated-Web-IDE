import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  ChevronDown,
  Copy,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Search,
  SplitSquareHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { terminalService } from '../../../services/terminalService';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useUIStore } from '../../../store/uiStore';
import { v4 as uuidv4 } from '../../../utils/uuid';

const IDE_ROOT_CWD = 'E:\\AI-Web-IDE';

type TerminalProfile = 'PowerShell' | 'Command Prompt' | 'Git Bash' | 'Node.js';

interface TerminalInstance {
  id: string;
  name: string;
  profile: TerminalProfile;
  cwd: string;
  isConnected: boolean;
}

const PROFILES: Array<{ name: TerminalProfile; shell: string; executable: string }> = [
  { name: 'PowerShell', shell: 'powershell.exe', executable: 'powershell' },
  { name: 'Command Prompt', shell: 'cmd.exe', executable: 'cmd' },
  { name: 'Git Bash', shell: 'bash.exe', executable: 'bash' },
  { name: 'Node.js', shell: 'node.exe', executable: 'node' },
];

function resolveTerminalCwd(workspacePath?: string) {
  if (workspacePath && /^[A-Za-z]:[\\/]/.test(workspacePath)) {
    return workspacePath.replace(/\//g, '\\');
  }

  if (workspacePath?.startsWith('\\\\')) {
    return workspacePath;
  }

  return IDE_ROOT_CWD;
}

function createTerminalInstance(cwd: string, profile: TerminalProfile = 'PowerShell', count = 1): TerminalInstance {
  return {
    id: uuidv4(),
    name: `${profile}${count > 1 ? ` ${count}` : ''}`,
    profile,
    cwd,
    isConnected: false,
  };
}

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketSessionRef = useRef<string | null>(null);
  const socketConnectedRef = useRef(false);
  const lineRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const { bottomPanelHeight, setBottomPanelHeight } = useUIStore();
  const terminalCwd = resolveTerminalCwd(workspace?.path);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [instances, setInstances] = useState<TerminalInstance[]>(() => [createTerminalInstance(terminalCwd)]);
  const [activeId, setActiveId] = useState(() => instances[0].id);

  const activeInstance = useMemo(
    () => instances.find((instance) => instance.id === activeId) || instances[0],
    [activeId, instances]
  );

  const activeProfile = PROFILES.find((profile) => profile.name === activeInstance.profile) || PROFILES[0];
  const prompt = activeInstance.profile === 'Command Prompt'
    ? `${activeInstance.cwd}>`
    : `PS ${activeInstance.cwd}> `;

  const fit = useCallback(() => {
    try {
      fitAddonRef.current?.fit();
    } catch {
      // xterm can throw during intermediate layout states.
    }
  }, []);

  const writePrompt = useCallback(() => {
    xtermRef.current?.write(`\x1b[38;2;204;204;204m${prompt}\x1b[0m`);
  }, [prompt]);

  const resetLine = useCallback((nextLine = '') => {
    const term = xtermRef.current;
    if (!term) return;
    term.write('\x1b[2K\r');
    writePrompt();
    lineRef.current = nextLine;
    term.write(nextLine);
  }, [writePrompt]);

  const clearTerminal = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.clear();
    lineRef.current = '';
    writePrompt();
    term.focus();
  }, [writePrompt]);

  const runCommand = useCallback((command: string) => {
    const term = xtermRef.current;
    if (!term) return;
    const trimmed = command.trim();
    if (!trimmed) return;

    historyRef.current = [trimmed, ...historyRef.current.filter((item) => item !== trimmed)].slice(0, 80);
    historyIndexRef.current = null;

    if (socketConnectedRef.current && socketSessionRef.current) {
      terminalService.sendData(socketSessionRef.current, `${trimmed}\r`);
      return;
    }

    term.write(trimmed);
    term.writeln('');
    void handleFallbackCommand(term, trimmed, activeInstance.cwd).finally(() => {
      lineRef.current = '';
      writePrompt();
    });
  }, [activeInstance.cwd, writePrompt]);

  const createInstance = useCallback((profile: TerminalProfile = activeInstance.profile) => {
    setInstances((current) => {
      const count = current.filter((instance) => instance.profile === profile).length + 1;
      const next = createTerminalInstance(terminalCwd, profile, count);
      setActiveId(next.id);
      return [...current, next];
    });
    setProfileMenuOpen(false);
  }, [activeInstance.profile, terminalCwd]);

  const closeInstance = useCallback((id: string) => {
    setInstances((current) => {
      if (current.length === 1) {
        const replacement = createTerminalInstance(terminalCwd, current[0].profile);
        setActiveId(replacement.id);
        return [replacement];
      }

      const index = current.findIndex((instance) => instance.id === id);
      const next = current.filter((instance) => instance.id !== id);
      if (activeId === id) {
        setActiveId(next[Math.max(0, index - 1)]?.id || next[0].id);
      }
      return next;
    });
  }, [activeId, terminalCwd]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#181818',
        foreground: '#cccccc',
        cursor: '#cccccc',
        cursorAccent: '#181818',
        black: '#181818',
        red: '#f44747',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#d4d4d4',
        selectionBackground: '#264f78',
      },
      fontFamily: 'Cascadia Code, JetBrains Mono, Fira Code, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.32,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      convertEol: true,
      windowsMode: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(terminalRef.current);
    xtermRef.current = term;
    term.focus();
    window.setTimeout(fit, 50);

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [fit]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !activeInstance) return;

    const socket = terminalService.getSocket();
    const sessionId = activeInstance.id;
    socketSessionRef.current = sessionId;
    socketConnectedRef.current = Boolean(socket?.connected);
    lineRef.current = '';
    historyIndexRef.current = null;
    term.clear();

    if (socket?.connected) {
      socket.emit('terminal:create', {
        sessionId,
        shell: activeProfile.shell,
        cwd: activeInstance.cwd,
        cols: term.cols,
        rows: term.rows,
      });

      const onData = (data: { sessionId: string; data: string }) => {
        if (data.sessionId === sessionId) term.write(data.data);
      };

      const onCreated = (session: { id: string; isConnected?: boolean }) => {
        if (session.id !== sessionId) return;
        socketConnectedRef.current = Boolean(session.isConnected);
        setInstances((current) => current.map((instance) =>
          instance.id === sessionId ? { ...instance, isConnected: Boolean(session.isConnected) } : instance
        ));
        term.clear();
        if (!session.isConnected) writePrompt();
        term.focus();
      };

      const onClosed = (data: { sessionId: string }) => {
        if (data.sessionId !== sessionId) return;
        socketConnectedRef.current = false;
        term.writeln('');
        term.writeln('\x1b[33mTerminal process exited. Press restart to create a new session.\x1b[0m');
      };

      socket.on('terminal:data', onData);
      socket.on('terminal:created', onCreated);
      socket.on('terminal:closed', onClosed);

      const dataDisposable = term.onData((data) => {
        socket.emit('terminal:data', { sessionId, data });
      });
      const resizeDisposable = term.onResize(({ cols, rows }) => {
        socket.emit('terminal:resize', { sessionId, cols, rows });
      });

      return () => {
        dataDisposable.dispose();
        resizeDisposable.dispose();
        socket.off('terminal:data', onData);
        socket.off('terminal:created', onCreated);
        socket.off('terminal:closed', onClosed);
        socket.emit('terminal:destroy', { sessionId });
      };
    }

    socketConnectedRef.current = false;
    setInstances((current) => current.map((instance) =>
      instance.id === sessionId ? { ...instance, isConnected: false } : instance
    ));
    term.writeln(`\x1b[90m${activeProfile.name} fallback terminal\x1b[0m`);
    term.writeln('\x1b[90mCommands run through the backend command runner when available.\x1b[0m');
    writePrompt();

    const dataDisposable = term.onData((data) => {
      if (data === '\r') {
        term.writeln('');
        const command = lineRef.current.trim();
        if (command) {
          historyRef.current = [command, ...historyRef.current.filter((item) => item !== command)].slice(0, 80);
          void handleFallbackCommand(term, command, activeInstance.cwd).finally(() => {
            lineRef.current = '';
            historyIndexRef.current = null;
            writePrompt();
          });
        } else {
          lineRef.current = '';
          historyIndexRef.current = null;
          writePrompt();
        }
        return;
      }

      if (data === '\x7f') {
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      if (data === '\x03') {
        term.write('^C');
        term.writeln('');
        lineRef.current = '';
        historyIndexRef.current = null;
        writePrompt();
        return;
      }

      if (data === '\x1b[A') {
        if (!historyRef.current.length) return;
        const nextIndex = historyIndexRef.current === null
          ? 0
          : Math.min(historyRef.current.length - 1, historyIndexRef.current + 1);
        historyIndexRef.current = nextIndex;
        resetLine(historyRef.current[nextIndex]);
        return;
      }

      if (data === '\x1b[B') {
        if (historyIndexRef.current === null) return;
        const nextIndex = historyIndexRef.current - 1;
        if (nextIndex < 0) {
          historyIndexRef.current = null;
          resetLine('');
        } else {
          historyIndexRef.current = nextIndex;
          resetLine(historyRef.current[nextIndex]);
        }
        return;
      }

      if (data >= ' ' || data === '\t') {
        lineRef.current += data;
        term.write(data);
      }
    });

    return () => dataDisposable.dispose();
  }, [activeId, activeInstance, activeProfile.name, activeProfile.shell, resetLine, writePrompt]);

  useEffect(() => {
    const onTerminalCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; command?: string }>).detail;
      if (detail?.action === 'new') {
        createInstance();
        return;
      }
      if (detail?.command) {
        runCommand(detail.command);
      }
    };

    window.addEventListener('ai-web-ide:terminal-command', onTerminalCommand);
    return () => window.removeEventListener('ai-web-ide:terminal-command', onTerminalCommand);
  }, [createInstance, runCommand]);

  const copySelection = async () => {
    const selection = xtermRef.current?.getSelection();
    if (selection) await navigator.clipboard?.writeText(selection);
    xtermRef.current?.focus();
  };

  const restartActive = () => {
    const profile = activeInstance.profile;
    closeInstance(activeInstance.id);
    window.setTimeout(() => createInstance(profile), 0);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#181818' }}>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex h-9 flex-shrink-0 items-center gap-2 border-b px-3 no-select"
          style={{ background: '#181818', borderColor: 'var(--color-border)' }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {instances.map((instance) => {
              const active = instance.id === activeId;
              return (
                <button
                  key={instance.id}
                  className="group flex h-8 min-w-[132px] max-w-[220px] items-center gap-2 rounded-t px-2 text-left text-xs"
                  style={{
                    background: active ? '#1f1f1f' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-textMuted)',
                    borderTop: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                  }}
                  onClick={() => setActiveId(instance.id)}
                >
                  <span className="text-[15px] leading-none" style={{ color: instance.isConnected ? '#4ec9b0' : '#dcdcaa' }}>
                    &gt;_
                  </span>
                  <span className="min-w-0 flex-1 truncate">{instance.name}</span>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: instance.isConnected ? '#4ec9b0' : '#dcdcaa' }}
                    title={instance.isConnected ? 'Real pty connected' : 'Command runner fallback'}
                  />
                  <span
                    role="button"
                    tabIndex={0}
                    className="flex h-4 w-4 items-center justify-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeInstance(instance.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        closeInstance(instance.id);
                      }
                    }}
                  >
                    <X size={11} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center gap-1">
            <button
              title="New Terminal"
              className="flex h-6 items-center gap-1 rounded px-2 text-xs hover:bg-white/10"
              style={{ color: 'var(--color-text)' }}
              onClick={() => createInstance()}
            >
              <Plus size={14} />
              <ChevronDown size={12} onClick={(event) => {
                event.stopPropagation();
                setProfileMenuOpen((open) => !open);
              }} />
            </button>
            {profileMenuOpen && (
              <div
                className="absolute right-0 top-7 z-50 w-48 rounded-md py-1 shadow-2xl"
                style={{ background: '#252526', border: '1px solid var(--color-border)' }}
              >
                {PROFILES.map((profile) => (
                  <button
                    key={profile.name}
                    className="flex h-8 w-full items-center justify-between px-3 text-left text-xs hover:bg-white/10"
                    style={{ color: 'var(--color-text)' }}
                    onClick={() => createInstance(profile.name)}
                  >
                    <span>{profile.name}</span>
                    <span style={{ color: 'var(--color-textMuted)' }}>{profile.executable}</span>
                  </button>
                ))}
              </div>
            )}
            <ToolbarBtn icon={<SplitSquareHorizontal size={14} />} title="Split Terminal" onClick={() => createInstance(activeInstance.profile)} />
            <ToolbarBtn icon={<Search size={14} />} title="Find in Terminal" onClick={() => xtermRef.current?.focus()} />
            <ToolbarBtn icon={<Copy size={14} />} title="Copy Selection" onClick={() => void copySelection()} />
            <ToolbarBtn icon={<RotateCcw size={14} />} title="Restart Terminal" onClick={restartActive} />
            <ToolbarBtn icon={<Trash2 size={14} />} title="Clear Terminal" onClick={clearTerminal} />
            <ToolbarBtn
              icon={bottomPanelHeight > 420 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              title={bottomPanelHeight > 420 ? 'Restore Panel Size' : 'Maximize Panel'}
              onClick={() => setBottomPanelHeight(bottomPanelHeight > 420 ? 250 : 560)}
            />
          </div>
        </div>

        <div ref={terminalRef} className="min-h-0 flex-1 overflow-hidden" style={{ padding: '8px 0 4px 8px' }} />
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
      style={{ color: 'var(--color-textMuted)' }}
    >
      {icon}
    </button>
  );
}

async function handleFallbackCommand(term: XTerm, cmd: string, cwd: string) {
  const command = cmd.trim();
  const parts = command.split(/\s+/);
  const name = parts[0]?.toLowerCase();

  switch (name) {
    case 'clear':
    case 'cls':
      term.clear();
      return;
    case 'cd':
      term.writeln('\x1b[90mDirectory changes are scoped to the workspace terminal runner.\x1b[0m');
      return;
    case 'help':
      term.writeln('VS Code-style terminal commands:');
      term.writeln('  cls, clear, dir, ls, pwd, date, npm, npx, node, powershell, cmd');
      term.writeln('  Use the toolbar for new terminals, split, clear, restart, copy, and maximize.');
      return;
    default:
      await runBackendCommand(term, command, cwd);
  }
}

async function runBackendCommand(term: XTerm, command: string, cwd: string) {
  const start = performance.now();
  term.writeln('\x1b[90mRunning command...\x1b[0m');
  try {
    const response = await fetch('/api/terminal/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, cwd }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json() as { output?: string; exitCode?: number };
    const output = result.output || '(command completed with no output)\n';
    output.replace(/\r/g, '').split('\n').forEach((line) => term.writeln(line));
    const duration = ((performance.now() - start) / 1000).toFixed(1);

    if (result.exitCode && result.exitCode !== 0) {
      term.writeln(`\x1b[31mCommand exited with code ${result.exitCode} after ${duration}s\x1b[0m`);
    } else {
      term.writeln(`\x1b[90mDone in ${duration}s\x1b[0m`);
    }
  } catch (error) {
    term.writeln('\x1b[33mBackend command runner is not connected.\x1b[0m');
    term.writeln(`\x1b[90m${error instanceof Error ? error.message : 'Start the backend server, reload the app, then run the command again.'}\x1b[0m`);
  }
}
