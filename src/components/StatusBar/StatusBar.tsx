import { AlertTriangle, Bell, Bot, Puzzle, Radio, Rocket, ShieldCheck, XCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useExtensionStore } from '../../store/extensionStore';
import { useEditorStore } from '../../store/editorStore';
import { getActiveExtensionIds } from '../../services/extensionRuntime';

export default function StatusBar() {
  const {
    setActiveBottomPanel,
    setBottomPanelVisible,
    setRightPanelVisible,
    setActiveSidebarPanel,
    setSidebarVisible,
    addNotification,
  } = useUIStore();
  const installedExtensions = useExtensionStore((state) => state.installed);
  const activeTabLanguage = useEditorStore((state) => state.getActiveTab()?.language ?? '');
  const activeExtCount = getActiveExtensionIds().size;

  const showPanel = (panel: 'terminal' | 'output' | 'problems' | 'debug' | 'ports') => {
    setActiveBottomPanel(panel);
    setBottomPanelVisible(true);
  };

  const runDevServer = async () => {
    showPanel('terminal');
    window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { command: 'npm run dev' } }));
    addNotification({ type: 'success', message: 'Started project task in Terminal' });
  };

  const openExtensions = () => {
    setActiveSidebarPanel('extensions');
    setSidebarVisible(true);
  };

  const openCopyrightSafety = () => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:open-copyright-safety'));
  };

  return (
    <div
      className="flex h-[26px] flex-shrink-0 items-center justify-between border-t px-2 no-select"
      style={{
        background: 'var(--color-statusBar)',
        borderColor: 'var(--color-border)',
        color: '#9a9a9a',
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Left section */}
      <div className="flex h-full items-center gap-1">
        <StatusItem title="Open Explorer" onClick={() => { setActiveSidebarPanel('explorer'); setSidebarVisible(true); }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--color-accent)' }}>&gt;&lt;</span>
        </StatusItem>
        <StatusItem title="Run project" onClick={() => void runDevServer()}>
          <Rocket size={13} />
          <span>Run</span>
        </StatusItem>
        <StatusItem title="Problems" onClick={() => showPanel('problems')}>
          <XCircle size={12} />
          <span>0</span>
          <AlertTriangle size={12} />
          <span>0</span>
        </StatusItem>
      </div>

      {/* Right section */}
      <div className="flex h-full items-center gap-1">
        {/* Language indicator */}
        {activeTabLanguage && (
          <StatusItem title="Language mode" onClick={() => addNotification({ type: 'info', message: `Active language: ${activeTabLanguage}` })}>
            <span style={{ textTransform: 'capitalize' }}>{activeTabLanguage}</span>
          </StatusItem>
        )}

        {/* Extensions indicator */}
        <StatusItem title="Manage extensions" onClick={openExtensions}>
          <Puzzle size={12} />
          <span>
            {installedExtensions.length > 0
              ? `${activeExtCount} active`
              : 'Extensions'}
          </span>
        </StatusItem>

        <StatusItem title="Open AI Pair Programmer" onClick={() => setRightPanelVisible(true)}>
          <Bot size={13} />
          <span>AI</span>
        </StatusItem>

        <StatusItem title="Copyright safety" onClick={openCopyrightSafety}>
          <ShieldCheck size={12} />
          <span>Content Safety</span>
        </StatusItem>

        <StatusItem title="Open Ports" onClick={() => showPanel('ports')}>
          <Radio size={12} />
          <span>Go Live</span>
        </StatusItem>

        <StatusItem title="Notifications" onClick={() => addNotification({ type: 'info', message: 'No new notifications' })}>
          <Bell size={12} />
        </StatusItem>
      </div>
    </div>
  );
}

function StatusItem({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-full items-center gap-1 rounded px-2 hover:bg-white/10 transition-colors"
      style={{ fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {children}
    </button>
  );
}
