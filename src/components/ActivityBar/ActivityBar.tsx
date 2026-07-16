import {
  Bug,
  CircleUserRound,
  Files,
  GitBranch,
  Puzzle,
  Search,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';
import { useExtensionStore } from '../../store/extensionStore';

const activities = [
  { id: 'explorer', icon: Files, title: 'Explorer (Ctrl+Shift+E)' },
  { id: 'search', icon: Search, title: 'Search (Ctrl+Shift+F)' },
  { id: 'git', icon: GitBranch, title: 'Source Control (Ctrl+Shift+G)' },
  { id: 'debug', icon: Bug, title: 'Run and Debug (Ctrl+Shift+D)' },
  { id: 'extensions', icon: Puzzle, title: 'Extensions (Ctrl+Shift+X)' },
  { id: 'thunder', icon: Zap, title: 'Thunder Client' },
  { id: 'ai', icon: Sparkles, title: 'AI Assistant (Ctrl+Alt+I)' },
];

export default function ActivityBar() {
  const {
    activeSidebarPanel,
    setActiveSidebarPanel,
    sidebarVisible,
    setSidebarVisible,
    rightPanelVisible,
    setRightPanelVisible,
    addNotification,
  } = useUIStore();
  const openTab = useEditorStore((state) => state.openTab);
  const installedCount = useExtensionStore((state) => state.installed.length);

  const openSettings = () => {
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
  };

  const handleClick = (id: string) => {
    if (id === 'ai') {
      setRightPanelVisible(!rightPanelVisible);
      return;
    }

    const panelId = id;

    if (activeSidebarPanel === panelId && sidebarVisible) {
      setSidebarVisible(false);
      return;
    }

    setActiveSidebarPanel(panelId as 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'thunder' | 'ai');
    setSidebarVisible(true);
  };

  return (
    <div
      className="flex flex-col items-center flex-shrink-0 no-select"
      style={{
        width: 48,
        background: 'var(--color-activityBar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div className="flex flex-1 flex-col items-center pt-1">
        {activities.map(({ id, icon: Icon, title }) => {
          const panelId = id;
          const active = id === 'ai' ? rightPanelVisible : activeSidebarPanel === panelId && sidebarVisible;

          return (
            <button
              key={id}
              title={title}
              onClick={() => handleClick(id)}
              className="relative flex h-[48px] w-[48px] items-center justify-center transition-all duration-150"
              style={{
                color: active ? '#e8e4f8' : 'var(--color-textFaint)',
                borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
              }}
            >
              {/* Icon with glow when active */}
              <span
                className="flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-150"
                style={active ? {
                  filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.6))',
                } : {}}
              >
                <Icon size={id === 'ai' ? 22 : 20} strokeWidth={active ? 2 : 1.6} />
              </span>

              {/* Badge for extensions count */}
              {id === 'extensions' && installedCount > 0 && (
                <span className="ext-badge" style={{ top: 4, right: 4, minWidth: 14, height: 14, fontSize: 9 }}>
                  {installedCount > 99 ? '99+' : installedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center pb-1">
        <button
          title="Accounts"
          onClick={() => addNotification({ type: 'info', message: 'Signed in as local workspace user' })}
          className="flex h-[48px] w-[48px] items-center justify-center transition-colors hover:bg-white/[0.06] hover:text-white"
          style={{ color: 'var(--color-textFaint)' }}
        >
          <CircleUserRound size={22} strokeWidth={1.5} />
        </button>
        <button
          title="Settings"
          onClick={openSettings}
          className="flex h-[48px] w-[48px] items-center justify-center transition-colors hover:bg-white/[0.06] hover:text-white"
          style={{ color: 'var(--color-textFaint)' }}
        >
          <Settings size={21} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
