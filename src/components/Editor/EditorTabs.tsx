import { X, Circle } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import FileTypeIcon from '../Icons/FileTypeIcon';

export default function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-end overflow-x-auto flex-shrink-0 no-select"
      style={{
        background: 'var(--color-tab)',
        borderBottom: '1px solid var(--color-border)',
        height: 35,
        minHeight: 35,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className="flex items-center gap-1.5 px-3 h-full cursor-pointer group flex-shrink-0 relative"
            style={{
              background: isActive ? 'var(--color-tabActive)' : 'var(--color-tab)',
              color: isActive ? 'var(--color-text)' : 'var(--color-textMuted)',
              borderRight: '1px solid var(--color-border)',
              borderTop: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
              maxWidth: 200,
              minWidth: 100,
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {/* File icon */}
            <FileTypeIcon filename={tab.fileName} size={14} className="flex-shrink-0" />

            {/* File name */}
            <span className="text-xs truncate flex-1">
              {tab.fileName}
            </span>

            {/* Dirty indicator / close button */}
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {tab.isDirty ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-white/20 transition-colors"
                >
                  <Circle size={8} fill="currentColor" className="opacity-80" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
