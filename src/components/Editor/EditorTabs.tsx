import { X, Circle, Play } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useUIStore } from '../../store/uiStore';
import FileTypeIcon from '../Icons/FileTypeIcon';

export default function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, getActiveTab } = useEditorStore();
  const { setBottomPanelVisible, setActiveBottomPanel, addNotification } = useUIStore();

  if (tabs.length === 0) return null;

  const handleRun = () => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.filePath) return;

    let relativePath = activeTab.filePath;
    if (relativePath.startsWith('/workspace/')) {
      relativePath = '.' + relativePath.slice('/workspace'.length);
    } else if (relativePath.startsWith('/')) {
      relativePath = '.' + relativePath;
    }

    const ext = activeTab.fileName.split('.').pop()?.toLowerCase();
    let command = '';

    switch (ext) {
      case 'js':
        command = `node "${relativePath}"`;
        break;
      case 'ts':
        command = `npx ts-node "${relativePath}"`;
        break;
      case 'py':
      case 'pyw':
        command = `python "${relativePath}"`;
        break;
      case 'html':
      case 'htm':
        command = `explorer "${relativePath}"`;
        addNotification({ type: 'info', message: 'Opening HTML in external browser' });
        break;
      case 'rs':
        command = `rustc "${relativePath}" && ./${activeTab.fileName.replace('.rs', '')}`;
        break;
      case 'go':
        command = `go run "${relativePath}"`;
        break;
      case 'java':
        command = `javac "${relativePath}" && java ${activeTab.fileName.replace('.java', '')}`;
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c':
        command = `g++ "${relativePath}" -o "${activeTab.fileName.split('.')[0]}" && ./"${activeTab.fileName.split('.')[0]}"`;
        break;
      case 'sh':
        command = `bash "${relativePath}"`;
        break;
      default:
        addNotification({ type: 'warning', message: `Cannot run .${ext} files automatically.` });
        return;
    }

    setBottomPanelVisible(true);
    setActiveBottomPanel('terminal');
    
    // Give terminal a moment to ensure it's visible before dispatching
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', {
        detail: { command }
      }));
    }, 50);
  };

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
      <div className="flex flex-1 overflow-x-auto">
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

      <div className="flex items-center px-2 h-full flex-shrink-0">
        <button
          onClick={handleRun}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 transition-colors"
          style={{ color: '#4ec9b0' }}
          title="Run active file"
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
