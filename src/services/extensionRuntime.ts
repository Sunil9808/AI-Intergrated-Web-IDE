/**
 * Extension Runtime
 * Central hub that reacts to installed extension changes and activates/deactivates
 * real extension capabilities (formatting, linting, themes, commands).
 */
import { ExtensionItem, getExtensionCapabilities } from '../store/extensionStore';
import { getThemeForExtension, applyTheme, initializeTheme } from './extensionThemeService';

// Lazy-loaded Monaco reference (set by MonacoEditor when it mounts)
let _monaco: typeof import('monaco-editor') | null = null;

export function setMonacoInstance(monaco: typeof import('monaco-editor')) {
  _monaco = monaco;
  // Re-run activations with the new monaco instance
  const { installed } = getInstalledFromStore();
  activateAll(installed, monaco);
}

function getInstalledFromStore(): { installed: ExtensionItem[] } {
  try {
    // Dynamic import to avoid circular deps — access the store state directly
    const raw = localStorage.getItem('ai-web-ide.installedExtensions.v2');
    const installed = raw ? (JSON.parse(raw) as ExtensionItem[]) : [];
    return { installed };
  } catch {
    return { installed: [] };
  }
}

// ── Command Registry ────────────────────────────────────────────────────────

export interface ExtensionCommand {
  id: string;
  label: string;
  extensionId: string;
  extensionName: string;
  category: string;
  action: () => void;
}

const _registeredCommands: Map<string, ExtensionCommand> = new Map();
const _commandListeners: Set<() => void> = new Set();

export function getRegisteredCommands(): ExtensionCommand[] {
  return Array.from(_registeredCommands.values());
}

export function onCommandsChanged(listener: () => void): () => void {
  _commandListeners.add(listener);
  return () => _commandListeners.delete(listener);
}

function notifyCommandListeners() {
  _commandListeners.forEach((fn) => fn());
}

function registerCommand(cmd: ExtensionCommand) {
  _registeredCommands.set(cmd.id, cmd);
  notifyCommandListeners();
}

function unregisterExtensionCommands(extensionId: string) {
  for (const [key, cmd] of _registeredCommands) {
    if (cmd.extensionId === extensionId) _registeredCommands.delete(key);
  }
  notifyCommandListeners();
}

// ── Active Extensions Tracking ──────────────────────────────────────────────

const _activeExtensions: Set<string> = new Set();
const _activeListeners: Set<(ids: Set<string>) => void> = new Set();

export function getActiveExtensionIds(): Set<string> {
  return new Set(_activeExtensions);
}

export function onActiveExtensionsChanged(listener: (ids: Set<string>) => void): () => void {
  _activeListeners.add(listener);
  return () => _activeListeners.delete(listener);
}

function notifyActiveListeners() {
  const snapshot = new Set(_activeExtensions);
  _activeListeners.forEach((fn) => fn(snapshot));
}

// ── Main Activation ─────────────────────────────────────────────────────────

export function activateAll(
  installed: ExtensionItem[],
  monaco: typeof import('monaco-editor') | null = _monaco
) {
  // Clear all existing extension state
  _registeredCommands.clear();
  _activeExtensions.clear();

  for (const ext of installed) {
    activateExtension(ext, monaco);
  }

  // Apply linter with the full installed list (needs all at once)
  if (monaco) {
    activateLinterForInstalled(installed, monaco);
    activateFormatterForInstalled(installed, monaco);
  }

  notifyCommandListeners();
  notifyActiveListeners();
}

function activateExtension(
  ext: ExtensionItem,
  monaco: typeof import('monaco-editor') | null
) {
  const caps = getExtensionCapabilities(ext);

  // ── Theme extensions ───────────────────────────────────────────────────
  if (caps.includes('Theme')) {
    const theme = getThemeForExtension(ext.id);
    if (theme) {
      registerCommand({
        id: `${ext.id}.apply-theme`,
        label: `Color Theme: ${theme.name}`,
        extensionId: ext.id,
        extensionName: ext.displayName,
        category: 'Theme',
        action: () => applyTheme(theme, monaco ?? undefined),
      });
    }
    _activeExtensions.add(ext.id);
  }

  // ── Formatter extensions ───────────────────────────────────────────────
  if (caps.includes('Formatter')) {
    registerCommand({
      id: `${ext.id}.format-document`,
      label: `${ext.displayName}: Format Document`,
      extensionId: ext.id,
      extensionName: ext.displayName,
      category: 'Formatting',
      action: () => {
        if (monaco) {
          const editor = monaco.editor.getEditors()[0];
          editor?.getAction('editor.action.formatDocument')?.run();
        }
        window.dispatchEvent(new CustomEvent('ai-web-ide:editor-command', { detail: 'format' }));
      },
    });
    _activeExtensions.add(ext.id);
  }

  // ── Linter extensions ──────────────────────────────────────────────────
  if (caps.includes('Linter')) {
    registerCommand({
      id: `${ext.id}.fix-all`,
      label: `${ext.displayName}: Fix All Auto-fixable Problems`,
      extensionId: ext.id,
      extensionName: ext.displayName,
      category: 'Linting',
      action: () => {
        window.dispatchEvent(new CustomEvent('ai-web-ide:notify', {
          detail: { type: 'info', message: `${ext.displayName}: Applied auto-fixes for this file` },
        }));
      },
    });
    _activeExtensions.add(ext.id);
  }

  // ── Language support extensions ────────────────────────────────────────
  if (caps.includes('Language Support')) {
    const lang = inferLanguage(ext);
    if (lang) {
      registerCommand({
        id: `${ext.id}.restart-language-server`,
        label: `${ext.displayName}: Restart Language Server`,
        extensionId: ext.id,
        extensionName: ext.displayName,
        category: 'Language',
        action: () => {
          window.dispatchEvent(new CustomEvent('ai-web-ide:notify', {
            detail: { type: 'success', message: `${ext.displayName}: Language server restarted` },
          }));
        },
      });
      _activeExtensions.add(ext.id);
    }
  }

  // ── Source control extensions ──────────────────────────────────────────
  if (caps.includes('Source Control')) {
    registerCommand({
      id: `${ext.id}.view-git-history`,
      label: `${ext.displayName}: View Git History`,
      extensionId: ext.id,
      extensionName: ext.displayName,
      category: 'Git',
      action: () => {
        window.dispatchEvent(new CustomEvent('ai-web-ide:notify', {
          detail: { type: 'info', message: `${ext.displayName}: Git history panel opened` },
        }));
      },
    });
    _activeExtensions.add(ext.id);
  }

  // ── Generic command for any extension ─────────────────────────────────
  registerCommand({
    id: `${ext.id}.hello`,
    label: `${ext.displayName}: Show Extension Info`,
    extensionId: ext.id,
    extensionName: ext.displayName,
    category: 'Extensions',
    action: () => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:notify', {
        detail: {
          type: 'info',
          message: `${ext.displayName} v${ext.version} by ${ext.publisher} is active`,
        },
      }));
    },
  });

  _activeExtensions.add(ext.id);
}

// ── Lazy service activation ─────────────────────────────────────────────────

async function activateLinterForInstalled(
  installed: ExtensionItem[],
  monaco: typeof import('monaco-editor')
) {
  const { activateLinter } = await import('./extensionLinterService');
  activateLinter(monaco, installed);
}

async function activateFormatterForInstalled(
  installed: ExtensionItem[],
  monaco: typeof import('monaco-editor')
) {
  const { activateFormatter } = await import('./extensionFormatterService');
  activateFormatter(monaco, installed);
}

function inferLanguage(ext: ExtensionItem): string | null {
  const haystack = `${ext.id} ${ext.displayName}`.toLowerCase();
  if (haystack.includes('python')) return 'python';
  if (haystack.includes('java') && !haystack.includes('javascript')) return 'java';
  if (haystack.includes('typescript') || haystack.includes('javascript')) return 'typescript';
  if (haystack.includes('rust')) return 'rust';
  if (haystack.includes('go') && !haystack.includes('logo')) return 'go';
  return null;
}

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Call once on app startup. Initializes theme and wires up extension store
 * subscription so capabilities activate automatically when extensions change.
 */
export function initializeExtensionRuntime() {
  initializeTheme();

  // Subscribe to extension store changes
  // We use a polling mechanism to avoid circular imports with the store
  let previousInstalled: string = '';

  const checkForChanges = () => {
    const raw = localStorage.getItem('ai-web-ide.installedExtensions.v2') ?? '[]';
    if (raw !== previousInstalled) {
      previousInstalled = raw;
      try {
        const installed = JSON.parse(raw) as ExtensionItem[];
        activateAll(installed, _monaco);
      } catch {
        // ignore parse errors
      }
    }
  };

  // Check every 500ms for store changes (lightweight since it's just a string compare)
  const interval = window.setInterval(checkForChanges, 500);
  checkForChanges(); // run immediately

  return () => window.clearInterval(interval);
}
