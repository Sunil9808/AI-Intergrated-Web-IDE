import { useMemo, useState } from 'react';
import { ChevronDown, Menu, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../../../store/editorStore';
import { useThunderStore, createThunderTabContent, defaultThunderRequest } from '../../../store/thunderStore';

type ThunderTab = 'activity' | 'collections' | 'env';

export default function ThunderPanel() {
  const [activeTab, setActiveTab] = useState<ThunderTab>('activity');
  const [filter, setFilter] = useState('');
  const { openTab } = useEditorStore();
  const { activity, collections, environments, clearActivity, addCollection, addEnvironment } = useThunderStore();

  const filteredActivity = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    if (!normalized) return activity;
    return activity.filter((item) => `${item.method} ${item.url}`.toLowerCase().includes(normalized));
  }, [activity, filter]);

  const newRequest = () => {
    openTab({
      id: `tab-thunder-${Date.now()}`,
      fileId: `thunder-${Date.now()}`,
      filePath: '/thunder/New Request',
      fileName: 'New Request',
      language: 'thunder-request',
      content: createThunderTabContent(defaultThunderRequest),
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
      <div className="flex h-10 items-center justify-between px-7 no-select">
        <span className="text-[16px] font-normal uppercase leading-none" style={{ color: 'var(--color-text)' }}>
          Thunder Client
        </span>
        <div className="flex items-center gap-2" style={{ color: 'var(--color-textMuted)' }}>
          <IconButton title="Refresh" onClick={() => undefined}><RefreshCw size={20} /></IconButton>
          <IconButton title="More Actions" onClick={clearActivity}><MoreHorizontal size={21} /></IconButton>
        </div>
      </div>

      <div className="px-6">
        <button
          className="flex h-[42px] w-full items-center overflow-hidden rounded-md text-[18px] font-semibold"
          style={{ background: '#2f86ad', color: '#ffffff' }}
          onClick={newRequest}
        >
          <span className="flex-1 text-center">New Request</span>
          <span className="flex h-full w-[42px] items-center justify-center border-l border-white/30">
            <ChevronDown size={22} />
          </span>
        </button>
      </div>

      <div className="mt-3 flex border-b" style={{ borderColor: 'var(--color-border)' }}>
        <ThunderNavButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>Activity</ThunderNavButton>
        <ThunderNavButton active={activeTab === 'collections'} onClick={() => setActiveTab('collections')}>Collections</ThunderNavButton>
        <ThunderNavButton active={activeTab === 'env'} onClick={() => setActiveTab('env')}>Env</ThunderNavButton>
      </div>

      {activeTab === 'activity' && (
        <>
          <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <input
              className="h-[38px] min-w-0 flex-1 rounded-full border bg-transparent px-5 text-[18px] outline-none placeholder:text-[#777]"
              style={{ borderColor: '#3a3a3a', color: 'var(--color-text)' }}
              placeholder="filter activity"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <button title="Activity Menu" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10" style={{ color: 'var(--color-textMuted)' }}>
              <Menu size={25} />
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            {filteredActivity.length ? (
              filteredActivity.map((item) => (
                <button
                  key={item.id}
                  className="border-b px-5 py-3 text-left hover:bg-white/5"
                  style={{ borderColor: 'var(--color-border)' }}
                  onClick={() => newRequest()}
                >
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--color-text)' }}>{item.method} {item.status || ''}</div>
                  <div className="truncate text-[13px]" style={{ color: 'var(--color-textMuted)' }}>{item.url}</div>
                  {item.time !== undefined && <div className="text-[12px]" style={{ color: 'var(--color-textMuted)' }}>{item.time}ms</div>}
                </button>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-[20px] leading-[2.6]" style={{ color: '#b8b8b8' }}>
                <div>Welcome to Thunder Client</div>
                <div>Your activity will appear here...</div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'collections' && (
        <ListPane
          empty="No collections yet."
          action="New Collection"
          onAction={() => addCollection(window.prompt('Collection name', 'My Collection') || 'My Collection')}
          items={collections.map((item) => `${item.name} (${item.count})`)}
        />
      )}

      {activeTab === 'env' && (
        <ListPane
          empty="No environments yet."
          action="New Environment"
          onAction={() => addEnvironment(window.prompt('Environment name', 'Local') || 'Local')}
          items={environments.map((item) => item.name)}
        />
      )}
    </div>
  );
}

function ThunderNavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="h-[44px] flex-1 border-b-2 text-[20px] font-semibold"
      style={{ color: active ? 'var(--color-text)' : '#8e8e8e', borderColor: active ? '#35a6dd' : 'transparent' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ListPane({ empty, action, onAction, items }: { empty: string; action: string; onAction: () => void; items: string[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <button className="mb-4 h-[34px] w-full rounded text-[15px]" style={{ background: '#2f86ad', color: '#ffffff' }} onClick={onAction}>
        {action}
      </button>
      {items.length ? items.map((item) => (
        <div key={item} className="border-b px-2 py-2 text-[14px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>{item}</div>
      )) : (
        <div className="pt-20 text-center text-[16px]" style={{ color: 'var(--color-textMuted)' }}>{empty}</div>
      )}
    </div>
  );
}

function IconButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10" onClick={onClick}>
      {children}
    </button>
  );
}
