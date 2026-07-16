import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();
const workspaceRoot = path.basename(process.cwd()).toLowerCase() === 'server'
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

function resolveCommandCwd(value: unknown) {
  const requested = typeof value === 'string' ? value.trim() : '';
  if (!requested) return workspaceRoot;

  const resolved = path.isAbsolute(requested)
    ? path.resolve(requested)
    : path.resolve(workspaceRoot, requested);
  if (path.isAbsolute(requested) && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return resolved;
  }

  const relative = path.relative(workspaceRoot, resolved);
  if (!relative.startsWith('..') && !path.isAbsolute(relative) && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return resolved;
  }

  return workspaceRoot;
}

function resolveCdTarget(cwd: unknown, target: unknown) {
  const base = resolveCommandCwd(cwd);
  const requested = String(target || '').trim();
  if (!requested || requested === '~') return os.homedir();

  const normalizedTarget = requested.replace(/^["']|["']$/g, '');
  const resolved = path.isAbsolute(normalizedTarget)
    ? path.resolve(normalizedTarget)
    : path.resolve(base, normalizedTarget);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Directory not found: ${normalizedTarget}`);
  }

  return resolved;
}

function isLongRunningTask(command: string) {
  return [
    /^npm\s+run\s+dev(?::client|:server)?(?:\s|$)/i,
    /^npm\s+start(?:\s|$)/i,
    /^vite(?:\s|$)/i,
    /^npx\s+vite(?:\s|$)/i,
    /^pnpm\s+dev(?:\s|$)/i,
    /^yarn\s+dev(?:\s|$)/i,
  ].some((pattern) => pattern.test(command));
}

router.get('/sessions', (_req: Request, res: Response) => {
  res.json([]);
});

router.post('/create', (req: Request, res: Response) => {
  res.json({ sessionId: Math.random().toString(36).slice(2), shell: '/bin/bash' });
});

router.post('/cwd', (req: Request, res: Response) => {
  try {
    const cwd = resolveCdTarget(req.body?.cwd, req.body?.target);
    res.json({ cwd });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to resolve directory' });
  }
});

// ── Real-time streaming terminal via SSE ─────────────────────────────────────
router.post('/stream', (req: Request, res: Response) => {
  const command = String(req.body?.command || '').trim();
  if (!command) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  const commandCwd = resolveCommandCwd(req.body?.cwd);

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const writeEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, ...((typeof data === 'object' && data) ? data : { value: data }) })}\n\n`);
  };

  // Long-running tasks: spawn in background, notify client
  if (isLongRunningTask(command)) {
    const child = spawn(command, {
      cwd: commandCwd,
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    writeEvent('stdout', { text: `Started background task: ${command}\nWorkspace: ${commandCwd}\n` });
    writeEvent('exit', { code: 0 });
    res.end();
    return;
  }

  // Spawn process and stream output chunks in real time
  const child = spawn(command, {
    cwd: commandCwd,
    shell: true,
    windowsHide: true,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      TERM: 'xterm-256color',
    },
  });

  let hasOutput = false;

  child.stdout?.on('data', (chunk: Buffer) => {
    hasOutput = true;
    writeEvent('stdout', { text: chunk.toString() });
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    hasOutput = true;
    writeEvent('stderr', { text: chunk.toString() });
  });

  child.on('error', (err) => {
    writeEvent('error', { text: err.message });
    writeEvent('exit', { code: 1 });
    res.end();
  });

  child.on('close', (code) => {
    if (!hasOutput) {
      writeEvent('stdout', { text: '(command completed with no output)\n' });
    }
    writeEvent('exit', { code: code ?? 0 });
    res.end();
  });

  // Kill child if client disconnects
  req.on('close', () => {
    try { child.kill(); } catch {}
  });
});

// ── Legacy single-shot run endpoint (kept for compatibility) ─────────────────
router.post('/run', (req: Request, res: Response) => {
  const command = String(req.body?.command || '').trim();
  if (!command) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  const commandCwd = resolveCommandCwd(req.body?.cwd);

  if (isLongRunningTask(command)) {
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
    env: {
      ...process.env,
      FORCE_COLOR: process.env.FORCE_COLOR || '1',
    },
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
