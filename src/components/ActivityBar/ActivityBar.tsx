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

const activities = [
  { id: 'explorer', icon: Files, title: 'Explorer' },
  { id: 'search', icon: Search, title: 'Search' },
  { id: 'git', icon: GitBranch, title: 'Source Control' },
  { id: 'debug', icon: Bug, title: 'Run and Debug' },
  { id: 'extensions', icon: Puzzle, title: 'Extensions' },
  { id: 'thunder', icon: Zap, title: 'Thunder Client' },
  { id: 'ai', icon: Sparkles, title: 'AI Assistant' },
];

export default function ActivityBar() {
  const { activeSidebarPanel, setActiveSidebarPanel, sidebarVisible, setSidebarVisible, rightPanelVisible, setRightPanelVisible } = useUIStore();

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
        width: 72,
        background: 'var(--color-activityBar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div className="flex flex-1 flex-col items-center pt-3">
        {activities.map(({ id, icon: Icon, title }) => {
          const panelId = id;
          const active = id === 'ai' ? rightPanelVisible : activeSidebarPanel === panelId && sidebarVisible;

          return (
            <button
              key={id}
              title={title}
              onClick={() => handleClick(id)}
              className="relative flex h-[72px] w-[72px] items-center justify-center transition-colors hover:bg-white/[0.04]"
              style={{
                color: active ? '#ffffff' : '#a0a0a0',
                borderLeft: active ? '2px solid #ffffff' : '2px solid transparent',
              }}
            >
              <Icon size={id === 'ai' ? 35 : 33} strokeWidth={1.55} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center pb-3">
        <button title="Accounts" className="flex h-[72px] w-[72px] items-center justify-center text-[#a0a0a0] hover:bg-white/[0.04]">
          <CircleUserRound size={35} strokeWidth={1.5} />
        </button>
        <button title="Manage" className="flex h-[72px] w-[72px] items-center justify-center text-[#a0a0a0] hover:bg-white/[0.04]">
          <Settings size={34} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
