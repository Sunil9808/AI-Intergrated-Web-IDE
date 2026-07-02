import { create } from 'zustand';
import { Workspace } from '../types/workspace.types';

interface WorkspaceStore {
  workspace: Workspace | null;
  recentWorkspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  
  setWorkspace: (workspace: Workspace | null) => void;
  setRecentWorkspaces: (workspaces: Workspace[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspace: null,
  recentWorkspaces: [],
  isLoading: false,
  error: null,

  setWorkspace: (workspace) => set({ workspace }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
