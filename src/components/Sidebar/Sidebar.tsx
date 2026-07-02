import { useUIStore } from '../../store/uiStore';
import Explorer from './Explorer/Explorer';
import SearchPanel from './Search/SearchPanel';
import GitPanel from './SourceControl/GitPanel';
import DebugPanel from './RunAndDebug/DebugPanel';
import ExtensionPanel from './Extensions/ExtensionPanel';
import AIChatPanel from './AIChat/AIChatPanel';
import ThunderPanel from './Thunder/ThunderPanel';

export default function Sidebar() {
  const { activeSidebarPanel } = useUIStore();

  const panels = {
    explorer: <Explorer />,
    search: <SearchPanel />,
    git: <GitPanel />,
    debug: <DebugPanel />,
    extensions: <ExtensionPanel />,
    thunder: <ThunderPanel />,
    ai: <AIChatPanel />,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {activeSidebarPanel ? panels[activeSidebarPanel] || null : null}
    </div>
  );
}
