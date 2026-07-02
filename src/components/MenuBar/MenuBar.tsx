import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useEditorStore } from '../../store/editorStore';

interface MenuItem {
  label: string;
  items: MenuSubItem[];
}

interface MenuSubItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export default function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toggleSidebar, toggleBottomPanel, toggleCommandPalette, setActiveSidebarPanel, setRightPanelVisible } = useUIStore();
  const { tabs, saveTab, activeTabId } = useEditorStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const menus: MenuItem[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: () => {} },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N' },
        { label: '', separator: true },
        { label: 'Open File...', shortcut: 'Ctrl+O' },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O' },
        { label: '', separator: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => activeTabId && saveTab(activeTabId) },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
        { label: 'Save All', shortcut: 'Ctrl+K S' },
        { label: '', separator: true },
        { label: 'Auto Save', action: () => {} },
        { label: '', separator: true },
        { label: 'Preferences', action: () => setActiveSidebarPanel(null) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { label: '', separator: true },
        { label: 'Find', shortcut: 'Ctrl+F' },
        { label: 'Replace', shortcut: 'Ctrl+H' },
        { label: '', separator: true },
        { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: () => setActiveSidebarPanel('search') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: toggleCommandPalette },
        { label: '', separator: true },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => setActiveSidebarPanel('explorer') },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => setActiveSidebarPanel('search') },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => setActiveSidebarPanel('git') },
        { label: 'Run & Debug', shortcut: 'Ctrl+Shift+D', action: () => setActiveSidebarPanel('debug') },
        { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => setActiveSidebarPanel('extensions') },
        { label: 'AI Pair Programmer', shortcut: 'Ctrl+Shift+A', action: () => setRightPanelVisible(true) },
        { label: '', separator: true },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: toggleBottomPanel },
        { label: '', separator: true },
        { label: 'Zoom In', shortcut: 'Ctrl+=' },
        { label: 'Zoom Out', shortcut: 'Ctrl+-' },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Go to File...', shortcut: 'Ctrl+P' },
        { label: 'Go to Line/Column...', shortcut: 'Ctrl+G' },
        { label: '', separator: true },
        { label: 'Go to Definition', shortcut: 'F12' },
        { label: 'Go Back', shortcut: 'Alt+←' },
        { label: 'Go Forward', shortcut: 'Alt+→' },
      ],
    },
    {
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: toggleBottomPanel },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
        { label: '', separator: true },
        { label: 'Run Task...' },
        { label: 'Run Build Task', shortcut: 'Ctrl+Shift+B' },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Welcome' },
        { label: 'Get Started' },
        { label: '', separator: true },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S' },
        { label: '', separator: true },
        { label: 'About AI Web IDE' },
      ],
    },
  ];

  return (
    <div
      ref={menuRef}
      className="flex items-center h-7 px-1 flex-shrink-0 no-select text-xs relative z-50"
      style={{ background: 'var(--color-titleBar)', borderBottom: '1px solid var(--color-border)' }}
    >
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            className="px-2 py-0.5 rounded transition-colors"
            style={{
              color: 'var(--color-text)',
              background: activeMenu === menu.label ? 'var(--color-selected)' : 'transparent',
            }}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
            onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>

          {activeMenu === menu.label && (
            <div
              className="absolute top-full left-0 py-1 rounded shadow-xl z-50 min-w-48"
              style={{
                background: '#252526',
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="my-1" style={{ borderTop: '1px solid var(--color-border)' }} />
                ) : (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-1 flex items-center justify-between gap-8 hover:bg-white/10 transition-colors"
                    style={{ color: item.disabled ? 'var(--color-textMuted)' : 'var(--color-text)' }}
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ color: 'var(--color-textMuted)', fontSize: '11px' }}>
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
