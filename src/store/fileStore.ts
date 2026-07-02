import { create } from 'zustand';
import { FileNode } from '../types/file.types';

interface FileStore {
  fileTree: FileNode[];
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  
  setFileTree: (tree: FileNode[]) => void;
  selectFile: (fileId: string | null) => void;
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  addFile: (file: FileNode) => void;
  removeFile: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  updateFileTree: (tree: FileNode[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFileById: (fileId: string) => FileNode | null;
  getFileByPath: (path: string) => FileNode | null;
}

const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFileById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findFileByPath = (nodes: FileNode[], path: string): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFileByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
};

const removeFileById = (nodes: FileNode[], id: string): FileNode[] => {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? removeFileById(n.children, id) : undefined,
    }));
};

const renameFileById = (nodes: FileNode[], id: string, newName: string): FileNode[] => {
  return nodes.map((n) => {
    if (n.id === id) {
      const parts = n.path.split('/');
      parts[parts.length - 1] = newName;
      return { ...n, name: newName, path: parts.join('/') };
    }
    return {
      ...n,
      children: n.children ? renameFileById(n.children, id, newName) : undefined,
    };
  });
};

export const useFileStore = create<FileStore>((set, get) => ({
  fileTree: [],
  selectedFileId: null,
  expandedFolders: new Set(),
  isLoading: false,
  error: null,
  searchQuery: '',

  setFileTree: (tree) => set({ fileTree: tree }),
  
  selectFile: (fileId) => set({ selectedFileId: fileId }),
  
  toggleFolder: (folderId) => {
    set((state) => {
      const expanded = new Set(state.expandedFolders);
      if (expanded.has(folderId)) {
        expanded.delete(folderId);
      } else {
        expanded.add(folderId);
      }
      return { expandedFolders: expanded };
    });
  },
  
  expandFolder: (folderId) => {
    set((state) => {
      const expanded = new Set(state.expandedFolders);
      expanded.add(folderId);
      return { expandedFolders: expanded };
    });
  },
  
  collapseFolder: (folderId) => {
    set((state) => {
      const expanded = new Set(state.expandedFolders);
      expanded.delete(folderId);
      return { expandedFolders: expanded };
    });
  },
  
  addFile: (file) => {
    set((state) => ({ fileTree: [...state.fileTree, file] }));
  },
  
  removeFile: (fileId) => {
    set((state) => ({ fileTree: removeFileById(state.fileTree, fileId) }));
  },
  
  renameFile: (fileId, newName) => {
    set((state) => ({ fileTree: renameFileById(state.fileTree, fileId, newName) }));
  },
  
  updateFileTree: (tree) => set({ fileTree: tree }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  getFileById: (fileId) => findFileById(get().fileTree, fileId),
  
  getFileByPath: (path) => findFileByPath(get().fileTree, path),
}));
