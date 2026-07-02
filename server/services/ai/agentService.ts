import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { getChatCompletion, AIContext } from './aiService';

const execAsync = promisify(exec);
const workspaceRoot = path.basename(process.cwd()).toLowerCase() === 'server'
  ? path.resolve(process.cwd(), '..')
  : process.cwd();
const MAX_OUTPUT = 5000;

type AgentAction =
  | { type: 'mkdir'; path: string }
  | { type: 'writeFile'; path: string; content: string }
  | { type: 'appendFile'; path: string; content: string }
  | { type: 'runCommand'; command: string }
  | { type: 'installDependency'; packages: string[]; dev?: boolean };

export interface AgentResult {
  summary: string;
  plan: string[];
  actions: Array<{
    type: string;
    target: string;
    success: boolean;
    output: string;
  }>;
  nextSteps: string[];
}

function resolveWorkspacePath(value: string): string {
  const requested = value.trim();
  if (!requested) throw new Error('Path is required');

  const resolved = path.resolve(workspaceRoot, requested);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access path outside workspace: ${value}`);
  }
  return resolved;
}

function isAllowedCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  const allowed = [
    /^npm\s+(run|test|install|i|exec|create|init)\b/i,
    /^npx\s+[\w@./:-]+/i,
    /^node\s+[\w./:-]+/i,
    /^tsc\b/i,
    /^git\s+(status|diff|log)\b/i,
  ];
  const blocked = /\b(rm|del|erase|format|shutdown|restart|powershell|cmd|curl|wget|scp|ssh)\b/i;
  return allowed.some((pattern) => pattern.test(trimmed)) && !blocked.test(trimmed);
}

async function runWorkspaceCommand(command: string): Promise<string> {
  if (!isAllowedCommand(command)) {
    throw new Error(`Command is not allowed for agent execution: ${command}`);
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceRoot,
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 5,
    });
    return `${stdout || ''}${stderr || ''}`.slice(0, MAX_OUTPUT) || '(command completed with no output)';
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return `${err.stdout || ''}${err.stderr || err.message}`.slice(0, MAX_OUTPUT);
  }
}

function extractJson(text: string): { summary?: string; plan?: string[]; actions?: AgentAction[]; nextSteps?: string[] } {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(raw);
}

function buildAgentPrompt(task: string, context: AIContext): string {
  const activeFile = context.currentFile
    ? `Active file: ${context.currentFile.path}\nLanguage: ${context.currentFile.language}\n\n${context.currentFile.content.slice(0, 12000)}`
    : 'No active file was provided.';

  return `You are an autonomous AI pair programmer inside a local web IDE.

Convert the user's request into a small, safe implementation plan and workspace actions.

User request:
${task}

Workspace facts:
- Root is the current project.
- You may create folders, write files, append files, install npm dependencies, and run verification commands.
- Prefer focused edits and the project's existing patterns.

Context:
${activeFile}

Return ONLY valid JSON with this shape:
{
  "summary": "short human summary",
  "plan": ["step 1", "step 2"],
  "actions": [
    { "type": "mkdir", "path": "relative/path" },
    { "type": "writeFile", "path": "relative/file.ts", "content": "full file contents" },
    { "type": "appendFile", "path": "relative/file.ts", "content": "content to append" },
    { "type": "installDependency", "packages": ["package-name"], "dev": false },
    { "type": "runCommand", "command": "npm run build" }
  ],
  "nextSteps": ["manual check, if any"]
}

Use relative paths only. Do not include destructive commands. If a file must be changed, provide the complete replacement content for writeFile.`;
}

export async function runPairProgrammerAgent(task: string, context: AIContext): Promise<AgentResult> {
  const aiText = await getChatCompletion(buildAgentPrompt(task, context), context, 6000);
  const parsed = extractJson(aiText);
  const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const result: AgentResult = {
    summary: parsed.summary || 'Agent task completed.',
    plan: Array.isArray(parsed.plan) ? parsed.plan : [],
    actions: [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
  };

  for (const action of actions) {
    try {
      if (action.type === 'mkdir') {
        const target = resolveWorkspacePath(action.path);
        await fs.mkdir(target, { recursive: true });
        result.actions.push({ type: action.type, target: action.path, success: true, output: 'Directory created' });
      } else if (action.type === 'writeFile') {
        const target = resolveWorkspacePath(action.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, action.content || '', 'utf-8');
        result.actions.push({ type: action.type, target: action.path, success: true, output: 'File written' });
      } else if (action.type === 'appendFile') {
        const target = resolveWorkspacePath(action.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.appendFile(target, action.content || '', 'utf-8');
        result.actions.push({ type: action.type, target: action.path, success: true, output: 'File appended' });
      } else if (action.type === 'installDependency') {
        const packages = Array.isArray(action.packages) ? action.packages.filter(Boolean) : [];
        if (packages.length === 0) throw new Error('No packages were provided');
        const command = `npm install ${action.dev ? '-D ' : ''}${packages.join(' ')}`;
        const output = await runWorkspaceCommand(command);
        result.actions.push({ type: action.type, target: packages.join(', '), success: true, output });
      } else if (action.type === 'runCommand') {
        const output = await runWorkspaceCommand(action.command);
        result.actions.push({ type: action.type, target: action.command, success: true, output });
      }
    } catch (error) {
      result.actions.push({
        type: action.type,
        target: 'path' in action ? action.path : 'command' in action ? action.command : 'packages' in action ? action.packages.join(', ') : '',
        success: false,
        output: error instanceof Error ? error.message : 'Action failed',
      });
    }
  }

  return result;
}
