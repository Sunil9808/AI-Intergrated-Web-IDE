import { exec, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { getChatCompletion, AIContext, AIRequestOptions } from './aiService';

const execAsync = promisify(exec);
const workspaceRoot = path.basename(process.cwd()).toLowerCase() === 'server'
  ? path.resolve(process.cwd(), '..')
  : process.cwd();
const MAX_OUTPUT = 5000;

type AgentAction =
  | { type: 'listFiles'; path?: string }
  | { type: 'readFile'; path: string }
  | { type: 'mkdir'; path: string }
  | { type: 'writeFile'; path: string; content: string }
  | { type: 'appendFile'; path: string; content: string }
  | { type: 'runCommand'; command: string }
  | { type: 'installDependency'; packages: string[]; dev?: boolean }
  | { type: 'detectLanguages' }
  | { type: 'installExtension'; extensionId: string; language?: string };

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
  /** Extensions the agent recommends installing */
  extensionRecommendations?: Array<{ extensionId: string; language: string; reason: string }>;
  /** Languages detected in workspace */
  detectedLanguages?: string[];
}

// ── Language → Extension mapping ─────────────────────────────────────────────

const LANGUAGE_EXTENSION_MAP: Record<string, Array<{ id: string; displayName: string }>> = {
  python: [
    { id: 'ms-python.python', displayName: 'Python' },
    { id: 'ms-python.pylint', displayName: 'Pylint' },
    { id: 'ms-python.black-formatter', displayName: 'Black Formatter' },
  ],
  typescript: [
    { id: 'dbaeumer.vscode-eslint', displayName: 'ESLint' },
    { id: 'esbenp.prettier-vscode', displayName: 'Prettier' },
    { id: 'ms-vscode.vscode-typescript-next', displayName: 'TypeScript Nightly' },
  ],
  javascript: [
    { id: 'dbaeumer.vscode-eslint', displayName: 'ESLint' },
    { id: 'esbenp.prettier-vscode', displayName: 'Prettier' },
  ],
  rust: [
    { id: 'rust-lang.rust-analyzer', displayName: 'rust-analyzer' },
  ],
  go: [
    { id: 'golang.go', displayName: 'Go' },
  ],
  java: [
    { id: 'redhat.java', displayName: 'Language Support for Java' },
    { id: 'vscjava.vscode-java-debug', displayName: 'Debugger for Java' },
  ],
  cpp: [
    { id: 'ms-vscode.cpptools', displayName: 'C/C++' },
  ],
  'c++': [
    { id: 'ms-vscode.cpptools', displayName: 'C/C++' },
  ],
  html: [
    { id: 'formulahendry.auto-rename-tag', displayName: 'Auto Rename Tag' },
    { id: 'bradlc.vscode-tailwindcss', displayName: 'Tailwind CSS IntelliSense' },
  ],
  css: [
    { id: 'esbenp.prettier-vscode', displayName: 'Prettier' },
    { id: 'bradlc.vscode-tailwindcss', displayName: 'Tailwind CSS IntelliSense' },
  ],
  docker: [
    { id: 'ms-azuretools.vscode-docker', displayName: 'Docker' },
  ],
};

// Extension patterns by file extension in workspace
const FILE_EXT_TO_LANG: Record<string, string> = {
  '.py': 'python',
  '.pyw': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.dockerfile': 'docker',
  'dockerfile': 'docker',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActionTarget(action: AgentAction): string {
  if ('path' in action) return (action as { path?: string }).path || '.';
  if ('command' in action) return (action as { command: string }).command;
  if ('packages' in action) return (action as { packages: string[] }).packages.join(', ');
  if ('extensionId' in action) return (action as { extensionId: string }).extensionId;
  return action.type;
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
    /^pip\s+install\b/i,
    /^pip3\s+install\b/i,
    /^go\s+get\b/i,
    /^cargo\s+(add|install)\b/i,
    /^composer\s+require\b/i,
  ];
  const blocked = /\b(rm|del|erase|format|shutdown|restart|powershell|cmd|curl|wget|scp|ssh)\b/i;
  return allowed.some((pattern) => pattern.test(trimmed)) && !blocked.test(trimmed);
}

function isLongRunningCommand(command: string): boolean {
  return /^npm\s+run\s+dev(?::client|:server)?(?:\s|$)/i.test(command.trim());
}

async function runWorkspaceCommand(command: string): Promise<string> {
  if (!isAllowedCommand(command)) {
    throw new Error(`Command is not allowed for agent execution: ${command}`);
  }

  if (isLongRunningCommand(command)) {
    const child = spawn(command, {
      cwd: workspaceRoot,
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return `Started background command: ${command}\nWorkspace: ${workspaceRoot}`;
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

function extractJson(text: string): {
  summary?: string;
  plan?: string[];
  actions?: AgentAction[];
  nextSteps?: string[];
  extensionRecommendations?: Array<{ extensionId: string; language: string; reason: string }>;
} {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const raw = fenced?.[1] || (start >= 0 && end > start ? text.slice(start, end + 1) : text);
  return JSON.parse(raw);
}

async function listWorkspaceFiles(dir = workspaceRoot, depth = 0): Promise<string[]> {
  if (depth > 3) return [];

  const ignore = new Set(['.git', 'node_modules', 'dist', 'dist-check', 'coverage', '.next', '.turbo']);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignore.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      files.push(`${relative}/`);
      files.push(...await listWorkspaceFiles(fullPath, depth + 1));
    } else {
      files.push(relative);
    }
  }

  return files.slice(0, 180);
}

async function readOptionalFile(relativePath: string, maxLength = 8000): Promise<string> {
  try {
    const target = resolveWorkspacePath(relativePath);
    return await fs.readFile(target, 'utf-8').then((content) => content.slice(0, maxLength));
  } catch {
    return '';
  }
}

// ── Language detection from workspace files ────────────────────────────────

async function detectWorkspaceLanguages(): Promise<string[]> {
  const counts: Record<string, number> = {};
  const files = await listWorkspaceFiles();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file).toLowerCase();
    const lang = FILE_EXT_TO_LANG[ext] || FILE_EXT_TO_LANG[baseName];
    if (lang) {
      counts[lang] = (counts[lang] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

export function getExtensionsForLanguage(language: string): Array<{ id: string; displayName: string }> {
  const lang = language.toLowerCase();
  return LANGUAGE_EXTENSION_MAP[lang] || [];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

async function buildAgentPrompt(task: string, context: AIContext): Promise<string> {
  const activeFile = context.currentFile
    ? `Active file: ${context.currentFile.path}\nLanguage: ${context.currentFile.language}\n\n${context.currentFile.content.slice(0, 12000)}`
    : 'No active file was provided.';
  const workspaceFiles = await listWorkspaceFiles();
  const packageJson = await readOptionalFile('package.json', 6000);
  const serverPackageJson = await readOptionalFile('server/package.json', 4000);
  const detectedLangs = await detectWorkspaceLanguages();

  return `You are an autonomous AI pair programmer inside a local web IDE powered by Gemini.

Convert the user's request into a small, safe implementation plan and workspace actions.

User request:
${task}

Workspace facts:
- Root is the current project.
- Detected programming languages: ${detectedLangs.join(', ') || 'none detected'}
- You may inspect files, create folders, write files, append files, install npm dependencies, and run verification commands.
- Prefer focused edits and the project's existing patterns.
- Use writeFile with the complete final contents for files you modify.
- Use runCommand for verification such as "npm run build" or "npx tsc --noEmit".
- Use "npm run dev" only when the user asks to run the project; it starts in the background.
- Use "detectLanguages" to scan the workspace for programming languages.
- Use "installExtension" to recommend IDE extensions for a detected language.

Context:
${activeFile}

Workspace files:
${workspaceFiles.join('\n')}

Root package.json:
${packageJson || '(not found)'}

Server package.json:
${serverPackageJson || '(not found)'}

Return ONLY valid JSON with this shape:
{
  "summary": "short human summary",
  "plan": ["step 1", "step 2"],
  "actions": [
    { "type": "listFiles", "path": "." },
    { "type": "readFile", "path": "relative/file.ts" },
    { "type": "mkdir", "path": "relative/path" },
    { "type": "writeFile", "path": "relative/file.ts", "content": "full file contents" },
    { "type": "appendFile", "path": "relative/file.ts", "content": "content to append" },
    { "type": "installDependency", "packages": ["package-name"], "dev": false },
    { "type": "runCommand", "command": "npm run build" },
    { "type": "detectLanguages" },
    { "type": "installExtension", "extensionId": "ms-python.python", "language": "python" }
  ],
  "extensionRecommendations": [
    { "extensionId": "ms-python.python", "language": "python", "reason": "Python language support" }
  ],
  "nextSteps": ["manual check, if any"]
}

Use relative paths only. Do not include destructive commands. If a file must be changed, provide the complete replacement content for writeFile.`;
}

// ── Main agent runner ─────────────────────────────────────────────────────────

export async function runPairProgrammerAgent(task: string, context: AIContext, options?: AIRequestOptions): Promise<AgentResult> {
  const prompt = await buildAgentPrompt(task, context);
  const aiText = await getChatCompletion(prompt, context, 8000, options);
  const parsed = extractJson(aiText);
  const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const result: AgentResult = {
    summary: parsed.summary || 'Agent task completed.',
    plan: Array.isArray(parsed.plan) ? parsed.plan : [],
    actions: [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    extensionRecommendations: Array.isArray(parsed.extensionRecommendations) ? parsed.extensionRecommendations : [],
    detectedLanguages: [],
  };

  for (const action of actions) {
    try {
      if (action.type === 'listFiles') {
        const target = resolveWorkspacePath((action as { path?: string }).path || '.');
        const entries = await fs.readdir(target, { withFileTypes: true });
        const output = entries
          .map((entry) => `${entry.isDirectory() ? 'dir ' : 'file'} ${entry.name}`)
          .join('\n') || '(empty directory)';
        result.actions.push({ type: action.type, target: (action as { path?: string }).path || '.', success: true, output });

      } else if (action.type === 'readFile') {
        const a = action as { path: string };
        const target = resolveWorkspacePath(a.path);
        const content = await fs.readFile(target, 'utf-8');
        result.actions.push({ type: action.type, target: a.path, success: true, output: content.slice(0, MAX_OUTPUT) });

      } else if (action.type === 'mkdir') {
        const a = action as { path: string };
        const target = resolveWorkspacePath(a.path);
        await fs.mkdir(target, { recursive: true });
        result.actions.push({ type: action.type, target: a.path, success: true, output: 'Directory created' });

      } else if (action.type === 'writeFile') {
        const a = action as { path: string; content: string };
        const target = resolveWorkspacePath(a.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, a.content || '', 'utf-8');
        result.actions.push({ type: action.type, target: a.path, success: true, output: 'File written' });

      } else if (action.type === 'appendFile') {
        const a = action as { path: string; content: string };
        const target = resolveWorkspacePath(a.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.appendFile(target, a.content || '', 'utf-8');
        result.actions.push({ type: action.type, target: a.path, success: true, output: 'File appended' });

      } else if (action.type === 'installDependency') {
        const a = action as { packages: string[]; dev?: boolean };
        const packages = Array.isArray(a.packages) ? a.packages.filter(Boolean) : [];
        if (packages.length === 0) throw new Error('No packages were provided');
        const command = `npm install ${a.dev ? '-D ' : ''}${packages.join(' ')}`;
        const output = await runWorkspaceCommand(command);
        result.actions.push({ type: action.type, target: packages.join(', '), success: true, output });

      } else if (action.type === 'runCommand') {
        const a = action as { command: string };
        const output = await runWorkspaceCommand(a.command);
        result.actions.push({ type: action.type, target: a.command, success: true, output });

      } else if (action.type === 'detectLanguages') {
        const langs = await detectWorkspaceLanguages();
        result.detectedLanguages = langs;
        // Auto-generate extension recommendations for detected langs
        for (const lang of langs) {
          const extensions = getExtensionsForLanguage(lang);
          for (const ext of extensions) {
            const alreadyRecommended = result.extensionRecommendations?.some((r) => r.extensionId === ext.id);
            if (!alreadyRecommended) {
              result.extensionRecommendations = result.extensionRecommendations || [];
              result.extensionRecommendations.push({
                extensionId: ext.id,
                language: lang,
                reason: `${ext.displayName} for ${lang} support`,
              });
            }
          }
        }
        result.actions.push({
          type: action.type,
          target: 'workspace',
          success: true,
          output: `Detected languages: ${langs.join(', ')}`,
        });

      } else if (action.type === 'installExtension') {
        const a = action as { extensionId: string; language?: string };
        // Extension installation is handled client-side; we record the recommendation
        result.extensionRecommendations = result.extensionRecommendations || [];
        const alreadyAdded = result.extensionRecommendations.some((r) => r.extensionId === a.extensionId);
        if (!alreadyAdded) {
          result.extensionRecommendations.push({
            extensionId: a.extensionId,
            language: a.language || 'general',
            reason: `Recommended by AI pair for ${a.language || 'this project'}`,
          });
        }
        result.actions.push({
          type: action.type,
          target: a.extensionId,
          success: true,
          output: `Extension ${a.extensionId} queued for installation`,
        });
      }
    } catch (error) {
      result.actions.push({
        type: action.type,
        target: getActionTarget(action),
        success: false,
        output: error instanceof Error ? error.message : 'Action failed',
      });
    }
  }

  return result;
}

/**
 * Called directly (not via AI) to auto-detect languages and return extension recommendations.
 * Used by the AI pair panel on file open.
 */
export async function autoDetectAndRecommendExtensions(language?: string): Promise<AgentResult['extensionRecommendations']> {
  const langs = language ? [language.toLowerCase()] : await detectWorkspaceLanguages();
  const recommendations: AgentResult['extensionRecommendations'] = [];

  for (const lang of langs.slice(0, 3)) {
    const extensions = getExtensionsForLanguage(lang);
    for (const ext of extensions) {
      recommendations.push({
        extensionId: ext.id,
        language: lang,
        reason: `${ext.displayName} for ${lang} support`,
      });
    }
  }

  return recommendations;
}
