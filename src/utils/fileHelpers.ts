import { FILE_ICONS } from './constants';

export const getFileIcon = (filename: string, isDirectory = false, isOpen = false): string => {
  if (isDirectory) return isOpen ? FILE_ICONS.folderOpen : FILE_ICONS.folder;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
};

export const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', java: 'java', cpp: 'cpp', c: 'c',
    cs: 'csharp', go: 'go', rs: 'rust', php: 'php', swift: 'swift',
    kt: 'kotlin', html: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', md: 'markdown',
    sh: 'shell', bash: 'shell', sql: 'sql', dockerfile: 'dockerfile',
    toml: 'toml', ini: 'ini',
  };
  return langMap[ext] || 'plaintext';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const getFileName = (path: string): string => {
  return path.split('/').pop() || path;
};

export const getDirName = (path: string): string => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
};

export const joinPath = (...parts: string[]): string => {
  return parts.join('/').replace(/\/+/g, '/');
};

export const isTextFile = (filename: string): boolean => {
  const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
    'pdf', 'zip', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib'];
  const ext = getFileExtension(filename);
  return !binaryExts.includes(ext);
};

export const generateFileId = (): string => {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};
