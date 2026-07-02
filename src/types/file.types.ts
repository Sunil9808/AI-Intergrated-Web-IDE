export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  language?: string;
  size?: number;
  lastModified?: number;
  isOpen?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
  parentId?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  language: string;
  size: number;
  lastModified: number;
}

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'move' | 'copy';
  sourcePath: string;
  targetPath?: string;
  isDirectory?: boolean;
}

export interface SearchResult {
  file: FileNode;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  matchText: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}
