import { ChevronRight } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getFileIcon } from '../../utils/fileHelpers';

export default function Breadcrumbs() {
  const { getActiveTab } = useEditorStore();
  const activeTab = getActiveTab();

  if (!activeTab) return null;

  const parts = activeTab.filePath.split('/').filter(Boolean);

  return (
    <div
      className="flex items-center px-3 py-1 text-xs no-select overflow-x-auto flex-shrink-0"
      style={{
        background: 'var(--color-tabActive)',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-textMuted)',
        height: 24,
      }}
    >
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        return (
          <div key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight size={10} className="opacity-40" />}
            <span
              className={`hover:text-white cursor-pointer transition-colors ${isLast ? 'text-white' : ''}`}
            >
              {isLast && (
                <span className="mr-1">{getFileIcon(part)}</span>
              )}
              {part}
            </span>
          </div>
        );
      })}
    </div>
  );
}
