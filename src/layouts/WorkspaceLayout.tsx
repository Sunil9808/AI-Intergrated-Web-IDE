import { useEffect, useRef, useState } from 'react';
import TitleBar from '../components/TitleBar/TitleBar';
import ActivityBar from '../components/ActivityBar/ActivityBar';
import Sidebar from '../components/Sidebar/Sidebar';
import Editor from '../components/Editor/Editor';
import BottomPanel from '../components/BottomPanel/BottomPanel';
import StatusBar from '../components/StatusBar/StatusBar';
import CommandPalette from '../components/Editor/CommandPalette';
import AIChatPanel from '../components/Sidebar/AIChat/AIChatPanel';
import { Sparkles } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useFileStore } from '../store/fileStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useEditorStore } from '../store/editorStore';
import { terminalService } from '../services/terminalService';
import { useTerminalStore } from '../store/terminalStore';
import { initializeExtensionRuntime } from '../services/extensionRuntime';

export default function WorkspaceLayout() {
  const {
    activityBarVisible,
    sidebarVisible, sidebarWidth, setSidebarWidth,
    bottomPanelVisible, bottomPanelHeight, setBottomPanelHeight,
    rightPanelVisible, rightPanelWidth, setRightPanelVisible, setRightPanelWidth,
    statusBarVisible,
    centeredLayout,
    commandPaletteOpen,
  } = useUIStore();
  const { setFileTree } = useFileStore();
  const { setWorkspace } = useWorkspaceStore();
  const { addSession } = useTerminalStore();
  const { closeAllTabs } = useEditorStore();

  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize the IDE shell without opening a project.
  useEffect(() => {
    // If opened as a new clean window, clear all tabs
    const params = new URLSearchParams(window.location.search);
    if (params.get('clean') === '1') {
      closeAllTabs();
      // Remove the flag from the URL without reloading
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('clean');
      window.history.replaceState({}, '', cleanUrl.pathname + (cleanUrl.search !== '?' ? cleanUrl.search : ''));
    }

    setWorkspace(null);
    setFileTree([]);

    // Initialize extension runtime (themes, linting, formatting, commands)
    const cleanupRuntime = initializeExtensionRuntime();

    // Connect terminal service
    terminalService.connect();
    terminalService.onSessionCreated((session) => {
      addSession(session);
    });

    return () => {
      cleanupRuntime();
      terminalService.disconnect();
    };
  }, []);


  // Sidebar resize
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(360, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleRightPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (event: MouseEvent) => {
      const delta = startX - event.clientX;
      const newWidth = Math.max(240, Math.min(520, startWidth + delta));
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingRight(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Bottom panel resize
  const handleBottomMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBottom(true);
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeight + delta));
      setBottomPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsDraggingBottom(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ background: 'var(--color-background)', color: 'var(--color-text)', userSelect: isDraggingSidebar || isDraggingBottom || isDraggingRight ? 'none' : 'auto' }}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        {activityBarVisible && <ActivityBar />}

        {/* Sidebar */}
        {sidebarVisible && (
          <>
            <div style={{ width: sidebarWidth, minWidth: 180, maxWidth: 360, flexShrink: 0, background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Sidebar />
            </div>
            {/* Sidebar resize handle */}
            <div
              className="w-1 cursor-col-resize flex-shrink-0 hover:bg-blue-500 transition-colors"
              style={{ background: isDraggingSidebar ? 'var(--color-accent)' : 'transparent' }}
              onMouseDown={handleSidebarMouseDown}
            />
          </>
        )}

        {/* Editor + Bottom Panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor area */}
          <div className="flex-1 overflow-hidden" style={{ display: 'flex', justifyContent: centeredLayout ? 'center' : 'stretch', background: 'var(--color-background)' }}>
            <div style={{ width: centeredLayout ? 'min(100%, 1180px)' : '100%', height: '100%' }}>
              <Editor />
            </div>
          </div>

          {/* Bottom panel resize handle */}
          {bottomPanelVisible && (
            <div
              className="h-1 cursor-row-resize flex-shrink-0 hover:bg-blue-500 transition-colors"
              style={{ background: isDraggingBottom ? 'var(--color-accent)' : 'transparent' }}
              onMouseDown={handleBottomMouseDown}
            />
          )}

          {/* Bottom Panel */}
          {bottomPanelVisible && (
            <div style={{ height: bottomPanelHeight, flexShrink: 0, background: 'var(--color-panel)', borderTop: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <BottomPanel />
            </div>
          )}
        </div>

        {rightPanelVisible && (
          <>
            <div
              className="w-1 cursor-col-resize flex-shrink-0 hover:bg-blue-500 transition-colors"
              style={{ background: isDraggingRight ? 'var(--color-accent)' : 'transparent' }}
              onMouseDown={handleRightPanelMouseDown}
            />
            <div style={{ width: rightPanelWidth, flexShrink: 0, background: 'var(--color-sidebar)', borderLeft: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <AIChatPanel title="AI Pair Programmer" onClose={() => setRightPanelVisible(false)} />
            </div>
          </>
        )}

        {!rightPanelVisible && (
          <button
            title="Open AI Pair Programmer"
            aria-label="Open AI Pair Programmer"
            className="fixed right-3 top-1/2 z-40 flex h-28 w-11 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-xl border shadow-2xl transition-all hover:-translate-x-1"
            style={{
              background: 'linear-gradient(180deg, #183247 0%, #10202d 48%, #181818 100%)',
              borderColor: '#2f7fb1',
              color: '#eaf7ff',
              boxShadow: '0 14px 34px rgba(0,0,0,0.45), 0 0 0 1px rgba(34,166,242,0.16) inset',
            }}
            onClick={() => setRightPanelVisible(true)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#22a6f2', color: '#071018' }}>
              <Sparkles size={17} strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-semibold leading-none [writing-mode:vertical-rl]">AI</span>
          </button>
        )}
      </div>

      {/* Status Bar */}
      {statusBarVisible && <StatusBar />}

      {/* Command Palette Overlay */}
      {commandPaletteOpen && <CommandPalette />}

    </div>
  );
}
