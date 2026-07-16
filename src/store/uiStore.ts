import { create } from 'zustand';

type ActiveSidebarPanel = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'thunder' | 'ai' | null;
type ActiveBottomPanel = 'terminal' | 'output' | 'problems' | 'debug' | 'ports';

interface UIStore {
  // Sidebar
  activityBarVisible: boolean;
  sidebarVisible: boolean;
  sidebarWidth: number;
  activeSidebarPanel: ActiveSidebarPanel;
  
  // Bottom panel
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
  activeBottomPanel: ActiveBottomPanel;
  
  // Right panel
  rightPanelVisible: boolean;
  rightPanelWidth: number;

  // Layout
  statusBarVisible: boolean;
  centeredLayout: boolean;
  
  // Command palette
  commandPaletteOpen: boolean;
  
  // Context menu
  contextMenu: ContextMenuState | null;
  
  // Notifications
  notifications: Notification[];
  
  // Actions
  setActivityBarVisible: (visible: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarPanel: (panel: ActiveSidebarPanel) => void;
  toggleSidebar: () => void;
  
  setBottomPanelVisible: (visible: boolean) => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveBottomPanel: (panel: ActiveBottomPanel) => void;
  toggleBottomPanel: () => void;
  
  setRightPanelVisible: (visible: boolean) => void;
  setRightPanelWidth: (width: number) => void;

  setStatusBarVisible: (visible: boolean) => void;
  setCenteredLayout: (visible: boolean) => void;
  
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  
  setContextMenu: (menu: ContextMenuState | null) => void;
  
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIStore>((set) => ({
  activityBarVisible: true,
  sidebarVisible: true,
  sidebarWidth: 240,
  activeSidebarPanel: 'explorer',
  
  bottomPanelVisible: false,
  bottomPanelHeight: 250,
  activeBottomPanel: 'terminal',
  
  rightPanelVisible: true,
  rightPanelWidth: 360,

  statusBarVisible: true,
  centeredLayout: false,
  
  commandPaletteOpen: false,
  contextMenu: null,
  notifications: [],

  setActivityBarVisible: (visible) => set({ activityBarVisible: visible }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel, sidebarVisible: true }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  
  setBottomPanelVisible: (visible) => set({ bottomPanelVisible: visible }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),
  toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),
  
  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),

  setStatusBarVisible: (visible) => set({ statusBarVisible: visible }),
  setCenteredLayout: (visible) => set({ centeredLayout: visible }),
  
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  
  setContextMenu: (menu) => set({ contextMenu: menu }),
  
  addNotification: (notification) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, notification.duration || 3000);
    }
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
