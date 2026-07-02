export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastOpenedAt: number;
  settings: WorkspaceSettings;
  recentFiles: string[];
}

export interface WorkspaceSettings {
  theme: string;
  fontSize: number;
  tabSize: number;
  formatOnSave: boolean;
  aiEnabled: boolean;
  terminalShell: string;
}

export interface WorkspaceState {
  workspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
}

export interface RecentWorkspace {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: number;
}
