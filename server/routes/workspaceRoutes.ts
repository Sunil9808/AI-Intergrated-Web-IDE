import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT
  ? path.resolve(process.env.WORKSPACE_ROOT)
  : path.resolve('./storage/workspaces');

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
    const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
    const workspaces = entries
      .filter(e => e.isDirectory())
      .map(e => ({
        id: Buffer.from(e.name).toString('base64').slice(0, 16),
        name: e.name,
        path: path.join(WORKSPACE_ROOT, e.name),
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      }));
    res.json(workspaces);
  } catch (error) { next(error); }
});

router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    const workspacePath = path.join(WORKSPACE_ROOT, name);
    await fs.mkdir(workspacePath, { recursive: true });
    // Create default files
    await fs.writeFile(path.join(workspacePath, 'README.md'), `# ${name}\n\nA new project.\n`);
    await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
    await fs.writeFile(path.join(workspacePath, 'src', 'index.ts'), `// ${name} - main entry point\n\nconsole.log('Hello from ${name}!');\n`);

    res.json({
      id: Buffer.from(name).toString('base64').slice(0, 16),
      name,
      path: workspacePath,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    });
  } catch (error) { next(error); }
});

router.post('/open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path: wsPath } = req.body;
    if (!wsPath) { res.status(400).json({ error: 'path is required' }); return; }
    const name = path.basename(wsPath);
    res.json({
      id: Buffer.from(wsPath).toString('base64').slice(0, 16),
      name,
      path: wsPath,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
