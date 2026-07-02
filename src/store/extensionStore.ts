import { create } from 'zustand';

export interface ExtensionItem {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  downloads?: number;
  rating?: number;
  iconUrl?: string;
  verified?: boolean;
  activationTime?: number;
  homepage?: string;
  source?: string;
  installedAt?: string;
  packageUrl?: string;
  readmeUrl?: string;
  changelogUrl?: string;
  cachedPackage?: boolean;
  capabilities?: string[];
}

interface ExtensionStore {
  installed: ExtensionItem[];
  installExtension: (extension: ExtensionItem) => void;
  installExtensionFromInternet: (extension: ExtensionItem) => Promise<ExtensionItem>;
  uninstallExtension: (extensionId: string) => void;
  isInstalled: (extensionId: string) => boolean;
}

const INSTALLED_STORAGE_KEY = 'ai-web-ide.installedExtensions.v2';
const DEPRECATED_DEMO_IDS = new Set([
  'anthropic.claude-code',
  'openai.codex',
  'github.copilot',
  'github.copilot-chat',
]);

export const recommendedCatalog: ExtensionItem[] = [
  extension('formulahendry.auto-rename-tag', 'Auto Rename Tag', 'Jun Han', '0.1.10', 'Auto rename paired HTML/XML tags.', { activationTime: 160 }),
  extension('saoudrizwan.claude-dev', 'Cline', 'Cline', '3.17.0', 'Autonomous coding agent right in your IDE.', { verified: true, activationTime: 4219 }),
  extension('continue.continue', 'Continue', 'Continue', '1.0.0', 'Open-source AI code assistant.', { verified: true, activationTime: 781 }),
  extension('ms-python.python', 'Python', 'Microsoft', '2026.0.0', 'Python language support with IntelliSense, debugging, and notebooks.', { verified: true, activationTime: 304 }),
  extension('esbenp.prettier-vscode', 'Prettier - Code formatter', 'Prettier', '11.0.0', 'Code formatter using Prettier.', { verified: true, activationTime: 93 }),
  extension('dbaeumer.vscode-eslint', 'ESLint', 'Microsoft', '3.0.0', 'Integrates ESLint JavaScript into the editor.', { verified: true, activationTime: 181 }),
  extension('bradlc.vscode-tailwindcss', 'Tailwind CSS IntelliSense', 'Tailwind Labs', '0.14.0', 'Intelligent Tailwind CSS tooling.', { verified: true, activationTime: 127 }),
  extension('eamodio.gitlens', 'GitLens', 'GitKraken', '16.0.0', 'Git supercharged for code authorship insights.', { verified: true, activationTime: 390 }),
  extension('ms-vscode.vscode-typescript-next', 'JavaScript and TypeScript Nightly', 'Microsoft', '6.0.0', 'Enables the latest TypeScript features.', { verified: true, activationTime: 118 }),
  extension('ms-toolsai.jupyter', 'Jupyter', 'Microsoft', '2026.1.0', 'Jupyter notebook support, interactive windows, and kernels.', { verified: true, activationTime: 514 }),
  extension('ms-vscode.powershell', 'PowerShell', 'Microsoft', '2026.0.0', 'PowerShell language support and debugging.', { verified: true, activationTime: 244 }),
  extension('redhat.java', 'Language Support for Java', 'Red Hat', '1.42.0', 'Java language support.', { verified: true, activationTime: 896 }),
  extension('vscjava.vscode-java-debug', 'Debugger for Java', 'Microsoft', '0.58.0', 'Java debugging support.', { verified: true, activationTime: 388 }),
  extension('golang.go', 'Go', 'Go Team at Google', '0.47.0', 'Rich Go language support.', { verified: true, activationTime: 314 }),
  extension('rust-lang.rust-analyzer', 'rust-analyzer', 'Rust Analyzer', '0.4.0', 'Rust language server support.', { verified: true, activationTime: 633 }),
  extension('ms-azuretools.vscode-docker', 'Docker', 'Microsoft', '1.30.0', 'Makes it easy to build, manage, and deploy containerized apps.', { verified: true, activationTime: 220 }),
  extension('ms-vscode.cpptools', 'C/C++', 'Microsoft', '1.23.0', 'C/C++ IntelliSense, debugging, and code browsing.', { verified: true, activationTime: 421 }),
  extension('ritwickdey.liveserver', 'Live Server', 'Ritwick Dey', '5.7.9', 'Launch a local development server with live reload.', { activationTime: 76 }),
  extension('streetsidesoftware.code-spell-checker', 'Code Spell Checker', 'Street Side Software', '4.0.0', 'Spelling checker for source code.', { activationTime: 102 }),
  extension('oderwat.indent-rainbow', 'indent-rainbow', 'oderwat', '8.3.1', 'Makes indentation easier to read.', { activationTime: 41 }),
  extension('usernamehw.errorlens', 'Error Lens', 'Alexander', '3.24.0', 'Improve highlighting of errors, warnings, and diagnostics.', { activationTime: 87 }),
  extension('pkief.material-icon-theme', 'Material Icon Theme', 'Philipp Kief', '5.20.0', 'Material Design icons for Visual Studio Code.', { activationTime: 32 }),
  extension('zhuangtongfa.material-theme', 'One Dark Pro', 'Binaryify', '3.19.0', "Atom's iconic One Dark theme.", { activationTime: 55 }),
  extension('gruntfuggly.todo-tree', 'Todo Tree', 'Gruntfuggly', '0.0.230', 'Show TODO, FIXME, and custom tags in a tree view.', { activationTime: 67 }),
  extension('mhutchie.git-graph', 'Git Graph', 'mhutchie', '1.30.0', 'View a Git graph of your repository.', { activationTime: 112 }),
  extension('christian-kohler.path-intellisense', 'Path Intellisense', 'Christian Kohler', '2.10.0', 'Autocomplete filenames in your editor.', { activationTime: 74 }),
];

export const fallbackRecommended: ExtensionItem[] = [
  ...recommendedCatalog,
  extension('ms-azuretools.vscode-containers', 'Container Tools', 'Microsoft', '2.0.0', 'Makes it easy to create, manage, and debug containerized applications.', { downloads: 14600000, rating: 4, verified: true }),
  extension('firefox-devtools.vscode-firefox-debug', 'Debugger for Firefox', 'Firefox DevTools', '2.15.0', 'Debug your web application or browser extension in Firefox.', { downloads: 5300000, rating: 4.5, verified: true }),
  extension('dbaeumer.vscode-eslint', 'ESLint', 'Microsoft', '3.0.0', 'Integrates ESLint JavaScript into the editor.', { downloads: 51000000, rating: 4.5, verified: true }),
  extension('ms-edgedevtools.vscode-edge-devtools', 'Microsoft Edge Tools', 'Microsoft', '2.1.0', 'Use the Microsoft Edge Tools from within the editor.', { downloads: 6200000, rating: 4, verified: true }),
  extension('ms-python.python', 'Python', 'Microsoft', '2026.0.0', 'Python language support with IntelliSense, debugging, and notebooks.', { downloads: 120000000, rating: 4.5, verified: true }),
];

export const mcpServers = [
  { id: 'filesystem', name: 'Filesystem', description: 'Browse and edit local workspace files.' },
  { id: 'github', name: 'GitHub', description: 'Connect repositories, issues, pull requests, and code search.' },
  { id: 'figma', name: 'Figma', description: 'Inspect, generate, and sync Figma designs.' },
];

export const useExtensionStore = create<ExtensionStore>((set, get) => ({
  installed: loadInstalledExtensions(),
  installExtension: (item) => set((state) => {
    if (state.installed.some((extensionItem) => extensionItem.id === item.id)) return state;
    const installed = [...state.installed, activateExtension(item, 'Local')];
    saveInstalledExtensions(installed);
    return { installed };
  }),
  installExtensionFromInternet: async (item) => {
    const onlineItem = await buildInternetInstall(item);
    set((state) => {
      const installed = state.installed.some((extensionItem) => extensionItem.id === onlineItem.id)
        ? state.installed.map((extensionItem) => extensionItem.id === onlineItem.id ? onlineItem : extensionItem)
        : [...state.installed, onlineItem];
      saveInstalledExtensions(installed);
      return { installed };
    });
    return onlineItem;
  },
  uninstallExtension: (extensionId) => set((state) => {
    const installed = state.installed.filter((extensionItem) => extensionItem.id !== extensionId);
    saveInstalledExtensions(installed);
    return { installed };
  }),
  isInstalled: (extensionId) => get().installed.some((item) => item.id === extensionId),
}));

export function extension(
  id: string,
  displayName: string,
  publisher: string,
  version: string,
  description: string,
  extras: Partial<ExtensionItem> = {}
): ExtensionItem {
  const name = id.split('.').slice(1).join('.') || id;
  return { id, name, displayName, publisher, version, description, ...extras };
}

export function getExtensionCapabilities(item: ExtensionItem) {
  if (item.capabilities?.length) return item.capabilities;

  const haystack = `${item.id} ${item.displayName} ${item.description}`.toLowerCase();
  const capabilities: string[] = [];
  if (/prettier|formatter|format/.test(haystack)) capabilities.push('Formatter');
  if (/eslint|lint/.test(haystack)) capabilities.push('Linter');
  if (/python|java|typescript|javascript|c\+\+|rust|go|tailwind/.test(haystack)) capabilities.push('Language Support');
  if (/debug|python|java|go|c\+\+/.test(haystack)) capabilities.push('Debugger');
  if (/git|github|gitlens/.test(haystack)) capabilities.push('Source Control');
  if (/theme|icon/.test(haystack)) capabilities.push('Theme');
  return capabilities.length ? capabilities : ['Marketplace Metadata'];
}

export function supportsFormatting(installed: ExtensionItem[]) {
  return installed.some((item) => getExtensionCapabilities(item).includes('Formatter'));
}

export function supportsLinting(installed: ExtensionItem[]) {
  return installed.some((item) => getExtensionCapabilities(item).includes('Linter'));
}

export function supportsLanguage(installed: ExtensionItem[], language: string) {
  const normalized = language.toLowerCase();
  return installed.some((item) => {
    const text = `${item.id} ${item.displayName} ${item.description}`.toLowerCase();
    return text.includes(normalized) || (normalized === 'typescript' && text.includes('javascript'));
  });
}

function loadInstalledExtensions() {
  try {
    const raw = localStorage.getItem(INSTALLED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExtensionItem[];
    if (!Array.isArray(parsed)) return [];
    const migrated = cleanStoredExtensions(parsed);
    saveInstalledExtensions(migrated);
    return migrated;
  } catch {
    return [];
  }
}

function saveInstalledExtensions(installed: ExtensionItem[]) {
  localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installed));
}

function cleanStoredExtensions(stored: ExtensionItem[]) {
  return stored
    .filter((item) => !DEPRECATED_DEMO_IDS.has(item.id))
    .map((item) => activateExtension(stripDemoIconData(item), item.source || 'Local'));
}

function stripDemoIconData(item: ExtensionItem) {
  if (!item.iconUrl?.startsWith('data:')) return item;
  const { iconUrl, ...rest } = item;
  return rest;
}

interface OpenVsxDetail {
  namespace?: string;
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  downloadCount?: number;
  averageRating?: number;
  categories?: string[];
  tags?: string[];
  homepage?: string;
  repository?: string;
  files?: {
    icon?: string;
    readme?: string;
    changelog?: string;
    download?: string;
  };
}

async function buildInternetInstall(item: ExtensionItem) {
  const [namespace, ...nameParts] = item.id.split('.');
  const name = nameParts.join('.');
  if (!namespace || !name) return activateExtension(item, 'Local');

  const response = await fetch(`https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Open VSX returned ${response.status}`);

  const data = await response.json() as OpenVsxDetail;
  const packageUrl = normalizeRemoteUrl(data.files?.download);
  const installed = activateExtension({
    ...item,
    id: `${data.namespace || namespace}.${data.name || name}`,
    name: data.name || name,
    displayName: data.displayName || item.displayName,
    publisher: data.namespace || item.publisher,
    version: data.version || item.version,
    description: data.description || item.description,
    downloads: data.downloadCount ?? item.downloads,
    rating: data.averageRating ?? item.rating,
    iconUrl: normalizeRemoteUrl(data.files?.icon) || item.iconUrl,
    homepage: data.homepage || data.repository || item.homepage,
    packageUrl,
    readmeUrl: normalizeRemoteUrl(data.files?.readme),
    changelogUrl: normalizeRemoteUrl(data.files?.changelog),
    verified: true,
    source: 'Open VSX',
    capabilities: uniqueList([
      ...(data.categories || []),
      ...(data.tags || []),
      ...getExtensionCapabilities(item),
    ]),
  }, 'Open VSX');

  installed.cachedPackage = packageUrl ? await cacheExtensionPackage(installed.id, packageUrl) : false;
  return installed;
}

function activateExtension(item: ExtensionItem, source: string): ExtensionItem {
  return {
    ...item,
    source,
    installedAt: item.installedAt || new Date().toISOString(),
    capabilities: item.capabilities?.length ? item.capabilities : getExtensionCapabilities(item),
  };
}

async function cacheExtensionPackage(extensionId: string, packageUrl: string) {
  if (!('caches' in window)) return false;

  try {
    const cache = await caches.open('ai-web-ide-extension-packages-v1');
    const response = await fetch(packageUrl);
    if (!response.ok) return false;
    await cache.put(`extension-package:${extensionId}`, response);
    return true;
  } catch {
    return false;
  }
}

function normalizeRemoteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://open-vsx.org${url.startsWith('/') ? '' : '/'}${url}`;
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
