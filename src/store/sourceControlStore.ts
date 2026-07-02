import { create } from 'zustand';

interface CommitEntry {
  id: string;
  message: string;
  files: string[];
  timestamp: number;
}

interface SourceControlStore {
  initialized: boolean;
  published: boolean;
  remoteUrl: string | null;
  branch: string;
  stagedFiles: string[];
  commits: CommitEntry[];
  initializeRepository: () => void;
  publishRepository: (remoteUrl: string) => void;
  stageFile: (filePath: string) => void;
  unstageFile: (filePath: string) => void;
  stageFiles: (filePaths: string[]) => void;
  unstageAll: () => void;
  commit: (message: string, files: string[]) => void;
}

export const useSourceControlStore = create<SourceControlStore>((set) => ({
  initialized: false,
  published: false,
  remoteUrl: null,
  branch: 'main',
  stagedFiles: [],
  commits: [],

  initializeRepository: () => set({ initialized: true, branch: 'main' }),
  publishRepository: (remoteUrl) => set({ initialized: true, published: true, remoteUrl }),
  stageFile: (filePath) => set((state) => ({
    stagedFiles: state.stagedFiles.includes(filePath) ? state.stagedFiles : [...state.stagedFiles, filePath],
  })),
  unstageFile: (filePath) => set((state) => ({
    stagedFiles: state.stagedFiles.filter((path) => path !== filePath),
  })),
  stageFiles: (filePaths) => set((state) => ({
    stagedFiles: Array.from(new Set([...state.stagedFiles, ...filePaths])),
  })),
  unstageAll: () => set({ stagedFiles: [] }),
  commit: (message, files) => set((state) => ({
    commits: [
      {
        id: `commit-${Date.now()}`,
        message,
        files,
        timestamp: Date.now(),
      },
      ...state.commits,
    ],
    stagedFiles: state.stagedFiles.filter((file) => !files.includes(file)),
  })),
}));
