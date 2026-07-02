import { X, Plus } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import Terminal from './Terminal/Terminal';
import OutputPanel from './Output/OutputPanel';
import ProblemsPanel from './Problems/ProblemsPanel';

const PANEL_TABS = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'output', label: 'Output' },
  { id: 'problems', label: 'Problems' },
  { id: 'debug', label: 'Debug Console' },
  { id: 'ports', label: 'Ports' },
];

export default function BottomPanel() {
  const { activeBottomPanel, setActiveBottomPanel, setBottomPanelVisible } = useUIStore();

  const openNewTerminal = () => {
    setActiveBottomPanel('terminal');
    setBottomPanelVisible(true);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { action: 'new' } }));
    }, 50);
  };

  const renderPanel = () => {
    switch (activeBottomPanel) {
      case 'terminal': return <Terminal />;
      case 'output': return <OutputPanel />;
      case 'problems': return <ProblemsPanel />;
      default: return (
        <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-textMuted)' }}>
          {activeBottomPanel} panel
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel tabs */}
      <div
        className="flex items-center flex-shrink-0 no-select"
        style={{ background: 'var(--color-panel)', borderBottom: '1px solid var(--color-border)', height: 35 }}
      >
        <div className="flex items-center flex-1 overflow-x-auto">
          {PANEL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveBottomPanel(tab.id as typeof activeBottomPanel)}
              className="px-4 h-full text-xs transition-colors flex-shrink-0 relative"
              style={{
                color: activeBottomPanel === tab.id ? 'var(--color-text)' : 'var(--color-textMuted)',
                borderBottom: activeBottomPanel === tab.id
                  ? '1px solid var(--color-accent)'
                  : '1px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2">
          <button
            title="New Terminal"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--color-textMuted)' }}
            onClick={openNewTerminal}
          >
            <Plus size={13} />
          </button>
          <button
            title="Close Panel"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--color-textMuted)' }}
            onClick={() => setBottomPanelVisible(false)}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>
    </div>
  );
}
