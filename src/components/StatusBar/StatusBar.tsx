import { AlertTriangle, Bell, Bot, Radio, Rocket, XCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useExtensionStore } from '../../store/extensionStore';

export default function StatusBar() {
  const { toggleBottomPanel } = useUIStore();
  const installedExtensions = useExtensionStore((state) => state.installed);

  return (
    <div
      className="flex h-[32px] flex-shrink-0 items-center justify-between border-t px-3 text-[16px] no-select"
      style={{
        background: 'var(--color-statusBar)',
        borderColor: 'var(--color-border)',
        color: '#a9a9a9',
      }}
    >
      <div className="flex h-full items-center gap-3">
        <StatusItem title="Remote window">
          <span className="text-[24px] leading-none">&gt;&lt;</span>
        </StatusItem>
        <StatusItem>
          <Rocket size={24} />
          <AlertTriangle size={22} />
        </StatusItem>
        <StatusItem onClick={toggleBottomPanel}>
          <XCircle size={21} />
          <span>0</span>
          <AlertTriangle size={21} />
          <span>0</span>
        </StatusItem>
      </div>

      <div className="flex h-full items-center gap-5">
        <StatusItem>
          <Bot size={23} />
        </StatusItem>
        <StatusItem title="Active Extensions">
          <span>Extensions: {installedExtensions.length}</span>
        </StatusItem>
        <StatusItem>
          <Radio size={21} />
          <span>Go Live</span>
        </StatusItem>
        <StatusItem>
          <Bell size={22} />
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
    <button title={title} onClick={onClick} className="flex h-full items-center gap-1 rounded px-1 hover:bg-white/10">
      {children}
    </button>
  );
}
