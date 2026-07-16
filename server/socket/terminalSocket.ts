import { Socket } from 'socket.io';
import os from 'os';
import fs from 'fs';

interface TerminalSession {
  pty: unknown;
  sessionId: string;
  socketId: string;
}

const sessions = new Map<string, TerminalSession>();

function resolveShell(shell?: string) {
  const requested = shell || '';
  if (os.platform() !== 'win32') {
    return {
      file: requested || process.env.SHELL || '/bin/bash',
      args: [] as string[],
      label: requested || process.env.SHELL || '/bin/bash',
    };
  }

  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const candidates: Record<string, string[]> = {
    'powershell.exe': [
      `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
      'powershell.exe',
    ],
    powershell: [
      `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
      'powershell.exe',
    ],
    'pwsh.exe': ['pwsh.exe'],
    pwsh: ['pwsh.exe'],
    'cmd.exe': [`${systemRoot}\\System32\\cmd.exe`, 'cmd.exe'],
    cmd: [`${systemRoot}\\System32\\cmd.exe`, 'cmd.exe'],
    'wsl.exe': [`${systemRoot}\\System32\\wsl.exe`, 'wsl.exe'],
    wsl: [`${systemRoot}\\System32\\wsl.exe`, 'wsl.exe'],
    'bash.exe': [
      `${programFiles}\\Git\\bin\\bash.exe`,
      `${programFiles}\\Git\\usr\\bin\\bash.exe`,
      'bash.exe',
    ],
    bash: [
      `${programFiles}\\Git\\bin\\bash.exe`,
      `${programFiles}\\Git\\usr\\bin\\bash.exe`,
      'bash.exe',
    ],
    'node.exe': ['node.exe'],
    node: ['node.exe'],
  };

  const lookup = candidates[requested.toLowerCase()] || [requested || 'powershell.exe'];
  const file = lookup.find((candidate) => !candidate.includes('\\') || fs.existsSync(candidate)) || lookup[0];
  return { file, args: [] as string[], label: requested || file };
}

export function initTerminalSocket(socket: Socket): void {
  socket.on('terminal:create', async (data: { sessionId: string; shell?: string; cwd?: string; cols?: number; rows?: number }) => {
    const { sessionId, shell, cwd, cols = 80, rows = 24 } = data;

    try {
      // Try to load node-pty (may not be installed)
      let pty: any;
      try {
        pty = require('node-pty');
      } catch {
        // node-pty not available - send error
        socket.emit('terminal:error', {
          sessionId,
          error: 'node-pty not installed. Run: cd server && npm install node-pty',
        });

        // Create simulated session
        socket.emit('terminal:created', {
          id: sessionId,
          name: 'bash (simulated)',
          shell: shell || '/bin/bash',
          cwd: cwd || os.homedir(),
          isConnected: false,
        });

        // Set up simulated command handling
        setupSimulatedTerminal(socket, sessionId, cwd || os.homedir());
        return;
      }

      const resolvedShell = resolveShell(shell);
      const workDir = cwd || os.homedir();

      const ptyProcess = pty.spawn(resolvedShell.file, resolvedShell.args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as NodeJS.ProcessEnv,
      });

      sessions.set(sessionId, { pty: ptyProcess, sessionId, socketId: socket.id });

      ptyProcess.onData((data: string) => {
        socket.emit('terminal:data', { sessionId, data });
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        sessions.delete(sessionId);
        socket.emit('terminal:closed', { sessionId, exitCode });
      });

      socket.emit('terminal:created', {
        id: sessionId,
        name: resolvedShell.label,
        shell: resolvedShell.file,
        cwd: workDir,
        isConnected: true,
        pid: ptyProcess.pid,
      });

      console.log(`[Terminal] Created session ${sessionId} (PID: ${ptyProcess.pid})`);
    } catch (error) {
      console.error('[Terminal] Error creating session:', error);
      socket.emit('terminal:error', {
        sessionId,
        error: `Failed to create terminal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  socket.on('terminal:data', (data: { sessionId: string; data: string }) => {
    const session = sessions.get(data.sessionId);
    if (session?.socketId !== socket.id) return;
    if (session && session.pty) {
      try {
        (session.pty as { write: (d: string) => void }).write(data.data);
      } catch (error) {
        console.error('[Terminal] Error writing data:', error);
      }
    }
  });

  socket.on('terminal:resize', (data: { sessionId: string; cols: number; rows: number }) => {
    const session = sessions.get(data.sessionId);
    if (session?.socketId !== socket.id) return;
    if (session && session.pty) {
      try {
        (session.pty as { resize: (cols: number, rows: number) => void }).resize(data.cols, data.rows);
      } catch (error) {
        console.error('[Terminal] Error resizing:', error);
      }
    }
  });

  socket.on('terminal:destroy', (data: { sessionId: string }) => {
    const session = sessions.get(data.sessionId);
    if (session?.socketId !== socket.id) return;
    if (session && session.pty) {
      try {
        (session.pty as { kill: () => void }).kill();
      } catch {}
      sessions.delete(data.sessionId);
      socket.emit('terminal:closed', { sessionId: data.sessionId });
      console.log(`[Terminal] Destroyed session ${data.sessionId}`);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Kill all sessions from this socket
    for (const [sessionId, session] of sessions.entries()) {
      if (session.socketId !== socket.id) continue;
      try {
        if (session.pty) (session.pty as { kill: () => void }).kill();
        sessions.delete(sessionId);
      } catch {}
    }
  });
}

function setupSimulatedTerminal(socket: Socket, sessionId: string, cwd: string): void {
  socket.on('terminal:data', (data: { sessionId: string; data: string }) => {
    if (data.sessionId !== sessionId) return;
    socket.emit('terminal:data', {
      sessionId,
      data: '\r\nInteractive terminal fallback is active. Use the frontend command runner prompt.\r\n',
    });
  });
}
