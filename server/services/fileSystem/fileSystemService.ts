import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
  lastModified?: number;
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  '__pycache__', '.venv', 'venv', '.DS_Store', 'coverage',
]);

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function generateId(filePath: string): string {
  return Buffer.from(filePath).toString('base64').slice(0, 16);
}

export async function buildFileTree(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 8) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath).catch(() => null);

      if (!stats) continue;

      const node: FileNode = {
        id: generateId(fullPath),
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        extension: entry.isDirectory() ? undefined : getExtension(entry.name),
        size: entry.isFile() ? stats.size : undefined,
        lastModified: stats.mtimeMs,
      };

      if (entry.isDirectory()) {
        node.children = await buildFileTree(fullPath, depth + 1);
      }

      nodes.push(node);
    }

    // Sort: directories first, then files, both alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error('Error building file tree:', err);
    return [];
  }
}

export async function readFile(filePath: string): Promise<{ content: string; encoding: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  return { content, encoding: 'utf-8' };
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function createFile(filePath: string, content = ''): Promise<FileNode> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  const stats = await fs.stat(filePath);
  return {
    id: generateId(filePath),
    name: path.basename(filePath),
    path: filePath,
    type: 'file',
    extension: getExtension(path.basename(filePath)),
    size: stats.size,
    lastModified: stats.mtimeMs,
  };
}

export async function createDirectory(dirPath: string): Promise<FileNode> {
  await fs.mkdir(dirPath, { recursive: true });
  return {
    id: generateId(dirPath),
    name: path.basename(dirPath),
    path: dirPath,
    type: 'directory',
    children: [],
    lastModified: Date.now(),
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  const stats = await fs.stat(filePath);
  if (stats.isDirectory()) {
    await fs.rm(filePath, { recursive: true, force: true });
  } else {
    await fs.unlink(filePath);
  }
}

export async function renameFile(oldPath: string, newPath: string): Promise<FileNode> {
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.rename(oldPath, newPath);
  const stats = await fs.stat(newPath);
  const isDir = stats.isDirectory();
  return {
    id: generateId(newPath),
    name: path.basename(newPath),
    path: newPath,
    type: isDir ? 'directory' : 'file',
    extension: isDir ? undefined : getExtension(path.basename(newPath)),
    lastModified: stats.mtimeMs,
    children: isDir ? [] : undefined,
  };
}

export async function searchFiles(query: string, rootPath: string): Promise<FileNode[]> {
  const results: FileNode[] = [];
  const lowerQuery = query.toLowerCase();

  async function search(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: generateId(fullPath),
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            extension: entry.isDirectory() ? undefined : getExtension(entry.name),
          });
        }
        if (entry.isDirectory()) await search(fullPath);
        if (results.length >= 50) return;
      }
    } catch {}
  }

  await search(rootPath);
  return results;
}
