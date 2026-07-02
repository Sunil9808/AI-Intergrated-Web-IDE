import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = Router();
const workspaceRoot = path.resolve(process.cwd(), '..');

function resolveCommandCwd(value: unknown) {
  const requested = typeof value === 'string' ? value.trim() : '';
  if (!requested) return workspaceRoot;

  const resolved = path.resolve(requested);
  if (path.isAbsolute(requested) && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return resolved;
  }

  return workspaceRoot;
}

router.get('/sessions', (_req: Request, res: Response) => {
  res.json([]);
});

router.post('/create', (req: Request, res: Response) => {
  res.json({ sessionId: Math.random().toString(36).slice(2), shell: '/bin/bash' });
});

router.post('/run', (req: Request, res: Response) => {
  const command = String(req.body?.command || '').trim();
  if (!command) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  const commandCwd = resolveCommandCwd(req.body?.cwd);

  if (/^npm\s+run\s+dev(?::client|:server)?(?:\s|$)/i.test(command)) {
    const child = spawn(command, {
      cwd: commandCwd,
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    res.json({
      command,
      cwd: commandCwd,
      exitCode: 0,
      output: `Started background task: ${command}\nWorkspace: ${commandCwd}\n`,
    });
    return;
  }

  exec(command, {
    cwd: commandCwd,
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 5,
  }, (error, stdout, stderr) => {
    res.json({
      command,
      cwd: commandCwd,
      exitCode: typeof error?.code === 'number' ? error.code : 0,
      output: `${stdout || ''}${stderr || ''}` || '(command completed with no output)\n',
    });
  });
});

export default router;
