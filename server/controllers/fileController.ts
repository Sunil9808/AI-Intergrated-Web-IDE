import { Request, Response, NextFunction } from 'express';
import path from 'path';
import {
  buildFileTree, readFile, writeFile, createFile,
  createDirectory, deleteFile, renameFile, searchFiles,
} from '../services/fileSystem/fileSystemService';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT
  ? path.resolve(process.env.WORKSPACE_ROOT)
  : path.resolve('./storage/workspaces');

function safePath(p: string): string {
  const resolved = path.resolve(p);
  // In production you'd validate the path is within workspace root
  return resolved;
}

export const fileController = {
  async getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dirPath = req.query.path as string || WORKSPACE_ROOT;
      const tree = await buildFileTree(safePath(dirPath));
      res.json(tree);
    } catch (error) {
      next(error);
    }
  },

  async readFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = req.query.path as string;
      if (!filePath) { res.status(400).json({ error: 'path is required' }); return; }
      const result = await readFile(safePath(filePath));
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async writeFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) { res.status(400).json({ error: 'path is required' }); return; }
      await writeFile(safePath(filePath), content || '');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  async createFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath, content, type } = req.body;
      if (!filePath) { res.status(400).json({ error: 'path is required' }); return; }
      const safe = safePath(filePath);
      const node = type === 'directory'
        ? await createDirectory(safe)
        : await createFile(safe, content || '');
      res.json(node);
    } catch (error) {
      next(error);
    }
  },

  async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { path: filePath } = req.body;
      if (!filePath) { res.status(400).json({ error: 'path is required' }); return; }
      await deleteFile(safePath(filePath));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  async renameFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath) { res.status(400).json({ error: 'oldPath and newPath are required' }); return; }
      const node = await renameFile(safePath(oldPath), safePath(newPath));
      res.json(node);
    } catch (error) {
      next(error);
    }
  },

  async searchFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, path: searchPath } = req.query as { query: string; path: string };
      if (!query) { res.status(400).json({ error: 'query is required' }); return; }
      const rootPath = searchPath ? safePath(searchPath) : WORKSPACE_ROOT;
      const results = await searchFiles(query, rootPath);
      res.json(results);
    } catch (error) {
      next(error);
    }
  },
};
