import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Columns,
  LayoutPanelLeft,
  LayoutPanelTop,
  Maximize2,
  MessageSquarePlus,
  Minus,
  MoreHorizontal,
  Search,
  Sidebar,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIStore } from '../../store/uiStore';
import { fileService } from '../../services/fileService';
import { browserFileCache } from '../../services/browserFileCache';
import { FileNode } from '../../types/file.types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSourceControlStore } from '../../store/sourceControlStore';

interface MenuItem {
  label: string;
  items: MenuSubItem[];
}

interface MenuSubItem {
  label: string;
  shortcut?: string;
  separator?: boolean;
}

interface FileMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
  children?: FileMenuItem[];
  childWidth?: number;
  action?: () => void;
}

const menus: MenuItem[] = [
  { label: 'File', items: [] },
  { label: 'Edit', items: [{ label: 'Undo', shortcut: 'Ctrl+Z' }, { label: 'Redo', shortcut: 'Ctrl+Y' }, { label: '', separator: true }, { label: 'Find', shortcut: 'Ctrl+F' }] },
  { label: 'Selection', items: [{ label: 'Select All', shortcut: 'Ctrl+A' }, { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' }] },
  { label: 'View', items: [{ label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' }, { label: 'Explorer', shortcut: 'Ctrl+Shift+E' }, { label: 'Terminal', shortcut: 'Ctrl+`' }] },
  { label: 'Go', items: [{ label: 'Back', shortcut: 'Alt+Left' }, { label: 'Forward', shortcut: 'Alt+Right' }, { label: 'Go to File...', shortcut: 'Ctrl+P' }] },
  { label: 'Run', items: [{ label: 'Start Debugging', shortcut: 'F5' }, { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' }] },
];

export default function TitleBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const openFolderInputRef = useRef<HTMLInputElement>(null);
  const openFolderModeRef = useRef<'open' | 'add'>('open');
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  const {
    toggleCommandPalette,
    addNotification,
    activityBarVisible,
    setActivityBarVisible,
    setActiveSidebarPanel,
    setSidebarVisible,
    setActiveBottomPanel,
    setBottomPanelVisible,
    rightPanelVisible,
    setRightPanelVisible,
    statusBarVisible,
    setStatusBarVisible,
    centeredLayout,
    setCenteredLayout,
    sidebarVisible,
    bottomPanelVisible,
  } = useUIStore();
  const { tabs, activeTabId, openTab, closeTab, closeAllTabs, saveTab, getActiveTab, updateSettings, settings, splitConfig, setSplitConfig } = useEditorStore();
  const { addFile, setFileTree } = useFileStore();
  const { setWorkspace } = useWorkspaceStore();
  const { initializeRepository, publishRepository } = useSourceControlStore();

  const activeTab = getActiveTab();
  const hasActiveTab = Boolean(activeTab);
  const hasDirtyTabs = tabs.some((tab) => tab.isDirty);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !layoutMenuRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        setOpenSubmenu(null);
        setLayoutMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const openFolder = (event: Event) => {
      openFolderModeRef.current = (event as CustomEvent<{ mode?: 'open' | 'add' }>).detail?.mode || 'open';
      openFolderInputRef.current?.click();
    };
    const openFile = () => openFileInputRef.current?.click();
    const notifyFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; type?: 'info' | 'success' | 'warning' | 'error' }>).detail;
      if (detail?.message) {
        addNotification({ type: detail.type || 'info', message: detail.message });
      }
    };
    const createClonedWorkspace = (event: Event) => {
      const detail = (event as CustomEvent<{ repositoryUrl?: string; repoName?: string }>).detail;
      if (!detail?.repositoryUrl) return;

      const repoName = detail.repoName || detail.repositoryUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repository';
      const tree = buildClonedRepositoryTree(repoName);
      setWorkspace(createWorkspaceDescriptor(repoName, `/cloned/${repoName}`));
      setFileTree(tree);
      initializeRepository();
      publishRepository(`https://github.com/local-preview/${repoName}`);
      openTab({
        id: `tab-clone-readme-${Date.now()}`,
        fileId: tree[0].children?.[0].id || `repo-readme-${Date.now()}`,
        filePath: `/cloned/${repoName}/README.md`,
        fileName: 'README.md',
        language: 'markdown',
        content: `# ${repoName}\n\nCloned from ${detail.repositoryUrl}.\n\nThis browser IDE created a local workspace preview for the repository.\n`,
        isDirty: false,
        isPreview: false,
        cursorPosition: { line: 1, column: 1 },
      });
    };

    window.addEventListener('ai-web-ide:open-folder', openFolder);
    window.addEventListener('ai-web-ide:open-file', openFile);
    window.addEventListener('ai-web-ide:notify', notifyFromEvent);
    window.addEventListener('ai-web-ide:create-cloned-workspace', createClonedWorkspace);
    return () => {
      window.removeEventListener('ai-web-ide:open-folder', openFolder);
      window.removeEventListener('ai-web-ide:open-file', openFile);
      window.removeEventListener('ai-web-ide:notify', notifyFromEvent);
      window.removeEventListener('ai-web-ide:create-cloned-workspace', createClonedWorkspace);
    };
  }, [addNotification, initializeRepository, openTab, publishRepository, setFileTree, setWorkspace]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5' && !event.altKey && !event.ctrlKey) {
        event.preventDefault();
        if (event.shiftKey) {
          notify('No active debug session to stop', 'warning');
        } else {
          startDebugging();
        }
        return;
      }

      if (event.key === 'F9' && !event.altKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        runEditorCommand('toggle-breakpoint');
        return;
      }

      if (event.key === 'F8' && !event.altKey && !event.ctrlKey) {
        event.preventDefault();
        showBottomPanel('problems');
        runEditorCommand(event.shiftKey ? 'previous-problem' : 'next-problem');
        return;
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
        return;
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        goForward();
        return;
      }

      if (event.altKey && event.key === 'F3') {
        event.preventDefault();
        showSidebarPanel('git');
        notify(event.shiftKey ? 'Previous change selected' : 'Next change selected', 'info');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'z' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        toggleWordWrap();
        return;
      }

      if (!event.ctrlKey) return;

      if (event.key.toLowerCase() === 'n' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        createUntitledFile();
      }

      if (event.key.toLowerCase() === 's' && !event.shiftKey) {
        event.preventDefault();
        saveActiveFile();
      }

      if (event.key.toLowerCase() === 's' && event.shiftKey) {
        event.preventDefault();
        saveActiveFileAs();
      }

      if (event.key.toLowerCase() === 'p' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        toggleCommandPalette();
      }

      if (event.key.toLowerCase() === 't' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        toggleCommandPalette();
      }

      if (event.key.toLowerCase() === 'g' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        runEditorCommand('go-to-line');
      }

      if (event.key === '\\' && event.shiftKey) {
        event.preventDefault();
        runEditorCommand('go-to-bracket');
      }

      if (event.key === 'F5' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        runWithoutDebugging();
      }

      if (event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        toggleCommandPalette();
      }

      if (event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        showSidebarPanel('explorer');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        showSidebarPanel('search');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        showSidebarPanel('git');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        showSidebarPanel('debug');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        showSidebarPanel('extensions');
      }

      if (event.altKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        showSidebarPanel('ai');
      }

      if (event.altKey && event.key === '/') {
        event.preventDefault();
        openBrowserView();
      }

      if (event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        showBottomPanel('problems');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        showBottomPanel('output');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        showBottomPanel('debug');
      }

      if (event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        runEditorCommand('go-to-symbol');
      }

      if (event.key === '`') {
        event.preventDefault();
        showBottomPanel('terminal');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addNotification({ type, message });
  };

  const createUntitledFile = () => {
    const nextNumber = tabs.filter((tab) => tab.filePath.startsWith('/untitled/')).length + 1;
    const fileName = nextNumber === 1 ? 'Untitled-1' : `Untitled-${nextNumber}`;
    openTab({
      id: `tab-untitled-${Date.now()}`,
      fileId: `untitled-${Date.now()}`,
      filePath: `/untitled/${fileName}`,
      fileName,
      language: 'plaintext',
      content: '',
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify('New text file created', 'success');
  };

  const createNamedFile = () => {
    const fileName = window.prompt('File name', 'new-file.txt')?.trim();
    if (!fileName) return;

    const language = fileService.getLanguageFromExtension(fileName);
    const filePath = `/workspace/my-project/${fileName}`;
    const node: FileNode = {
      id: `file-${Date.now()}`,
      name: fileName,
      path: filePath,
      type: 'file',
      extension: fileName.split('.').pop(),
      language,
      lastModified: Date.now(),
    };

    addFile(node);
    openTab({
      id: `tab-${node.id}`,
      fileId: node.id,
      filePath,
      fileName,
      language,
      content: '',
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify(`${fileName} created`, 'success');
  };

  const openNewWindow = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
    notify('Opened a new IDE window', 'success');
  };

  const triggerOpenFile = () => openFileInputRef.current?.click();
  const triggerOpenFolder = () => {
    openFolderModeRef.current = 'open';
    openFolderInputRef.current?.click();
  };
  const triggerAddFolder = () => {
    openFolderModeRef.current = 'add';
    openFolderInputRef.current?.click();
  };

  const handleOpenFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    for (const file of files) {
      const content = await file.text();
      const language = fileService.getLanguageFromExtension(file.name);
      const fileId = `local-file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filePath = `/local/${file.name}`;
      browserFileCache.register(filePath, file);
      const node: FileNode = {
        id: fileId,
        name: file.name,
        path: filePath,
        type: 'file',
        extension: file.name.split('.').pop(),
        language,
        size: file.size,
        lastModified: file.lastModified,
      };

      addFile(node);
      openTab({
        id: `tab-${fileId}`,
        fileId,
        filePath,
        fileName: file.name,
        language,
        content,
        isDirty: false,
        isPreview: false,
        cursorPosition: { line: 1, column: 1 },
      });
    }
    notify(`Opened ${files.length} file${files.length === 1 ? '' : 's'}`, 'success');
  };

  const handleOpenFolder = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const isAddFolder = openFolderModeRef.current === 'add';
    if (!isAddFolder) {
      browserFileCache.clear();
    }
    const tree = await buildFolderTree(files);
    const folderName = tree[0]?.name || 'Opened Folder';
    if (!isAddFolder) {
      closeAllTabs();
    }
    setWorkspace(createWorkspaceDescriptor(folderName, `/local-folder/${folderName}`));
    setFileTree((isAddFolder ? [...useFileStore.getState().fileTree, ...tree] : tree));
    notify(`${isAddFolder ? 'Added' : 'Opened'} ${folderName} with ${files.length} file${files.length === 1 ? '' : 's'}`, 'success');
    openFolderModeRef.current = 'open';
  };

  const saveActiveFile = async () => {
    const tab = getActiveTab();
    if (!tab) return;

    try {
      await fileService.writeFile(tab.filePath, tab.content);
      saveTab(tab.id);
      notify(`${tab.fileName} saved`, 'success');
    } catch {
      saveTab(tab.id);
      notify(`${tab.fileName} saved locally`, 'success');
    }
  };

  const saveActiveFileAs = () => {
    const tab = getActiveTab();
    if (!tab) return;

    const blob = new Blob([tab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = tab.fileName || 'untitled.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    saveTab(tab.id);
    notify(`${tab.fileName} downloaded`, 'success');
  };

  const saveAllFiles = async () => {
    if (!tabs.length) return;
    await Promise.all(
      tabs.map(async (tab) => {
        try {
          await fileService.writeFile(tab.filePath, tab.content);
        } catch {
          // Local and imported files may not exist on the backend; still mark them clean.
        }
        saveTab(tab.id);
      })
    );
    notify('All open files saved', 'success');
  };

  const closeActiveEditor = () => {
    const tab = getActiveTab();
    if (!tab) return;
    closeTab(tab.id);
  };

  const closeWindow = () => {
    window.close();
    notify('Your browser may block closing tabs it did not open', 'warning');
  };

  const toggleAutoSave = () => {
    updateSettings({ autoSave: !settings.autoSave });
    notify(`Auto Save ${settings.autoSave ? 'disabled' : 'enabled'}`, 'success');
  };

  const showPreferences = (label: string) => {
    toggleCommandPalette();
    notify(`${label} can be changed from the command palette`, 'info');
  };

  const shareWorkspace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Workspace link copied', 'success');
    } catch {
      notify('Could not copy workspace link', 'error');
    }
  };

  const runEditorCommand = (command: string) => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:editor-command', { detail: command }));
  };

  const runTerminalCommand = (command: string) => {
    showBottomPanel('terminal');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { command } }));
    }, 50);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      notify('Navigated back', 'info');
    } else {
      notify('No previous location', 'warning');
    }
  };

  const goForward = () => {
    window.history.forward();
    notify('Navigated forward', 'info');
  };

  const openWorkspaceSearch = (replace = false) => {
    setActiveSidebarPanel('search');
    setSidebarVisible(true);
    window.dispatchEvent(new CustomEvent('ai-web-ide:search-command', { detail: { replace } }));
  };

  const showSidebarPanel = (panel: 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'thunder' | 'ai') => {
    if (panel === 'ai') {
      setRightPanelVisible(true);
      return;
    }

    setActiveSidebarPanel(panel);
    setSidebarVisible(true);
  };

  const showBottomPanel = (panel: 'terminal' | 'output' | 'problems' | 'debug' | 'ports') => {
    setActiveBottomPanel(panel);
    setBottomPanelVisible(true);
  };

  const toggleWordWrap = () => {
    const nextWordWrap = settings.wordWrap === 'on' ? 'off' : 'on';
    updateSettings({ wordWrap: nextWordWrap });
    notify(`Word Wrap ${nextWordWrap === 'on' ? 'enabled' : 'disabled'}`, 'success');
  };

  const openBrowserView = () => {
    window.open(window.location.origin, '_blank', 'noopener,noreferrer');
    notify('Browser view opened in a new tab', 'success');
  };

  const startDebugging = () => {
    showSidebarPanel('debug');
    showBottomPanel('debug');
    notify('Run and Debug is ready. Add a configuration to start a debug session.', 'info');
  };

  const runWithoutDebugging = () => {
    showBottomPanel('terminal');
    notify('Terminal opened for running the project', 'success');
  };

  const newTerminal = () => {
    showBottomPanel('terminal');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { action: 'new' } }));
    }, 50);
    notify('New terminal opened', 'success');
  };

  const splitTerminal = () => {
    showBottomPanel('terminal');
    notify('Split terminal view is not available yet; focused the terminal instead', 'info');
  };

  const newTerminalWindow = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
    notify('Opened a new IDE window for terminal work', 'success');
  };

  const runActiveFile = () => {
    const tab = getActiveTab();
    if (!tab) {
      notify('Open a file before running the active file', 'warning');
      return;
    }

    const ext = tab.fileName.split('.').pop()?.toLowerCase();
    const quotedPath = `"${tab.filePath}"`;
    const commandByExt: Record<string, string> = {
      js: `node ${quotedPath}`,
      cjs: `node ${quotedPath}`,
      mjs: `node ${quotedPath}`,
      ts: `npx ts-node ${quotedPath}`,
      py: `python ${quotedPath}`,
      ps1: `powershell -File ${quotedPath}`,
      sh: `bash ${quotedPath}`,
    };

    runTerminalCommand(commandByExt[ext || ''] || `echo "No runner configured for ${tab.fileName}"`);
  };

  const addDebugConfiguration = () => {
    showSidebarPanel('debug');
    notify('Create a launch.json file from the Run and Debug panel', 'info');
  };

  const installAdditionalDebuggers = () => {
    showSidebarPanel('extensions');
    notify('Extensions opened. Search for the debugger you need.', 'info');
  };

  const openHelpUrl = (url: string, label: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    notify(`${label} opened`, 'success');
  };

  const recentItems = useMemo<FileMenuItem[]>(
    () => [
      { id: 'recent-ai-web-ide', label: 'AI-Web-IDE', action: () => notify('AI-Web-IDE is already open', 'info') },
      { id: 'recent-web-dev', label: 'web development', action: () => notify('Recent workspace selected', 'info') },
      { id: 'recent-clear', label: 'Clear Recently Opened', action: () => notify('Recent list cleared for this session', 'success') },
    ],
    []
  );

  const fileMenuItems: FileMenuItem[] = [
    { id: 'new-text-file', label: 'New Text File', shortcut: 'Ctrl+N', action: createUntitledFile },
    { id: 'new-file', label: 'New File...', shortcut: 'Ctrl+Alt+Windows+N', action: createNamedFile },
    { id: 'new-window', label: 'New Window', shortcut: 'Ctrl+Shift+N', action: openNewWindow },
    { id: 'new-window-profile', label: 'New Window with Profile', children: [
      { id: 'profile-default', label: 'Default Profile', action: openNewWindow },
      { id: 'profile-web', label: 'Web IDE Profile', action: openNewWindow },
    ] },
    { id: 'sep-open', separator: true },
    { id: 'open-file', label: 'Open File...', shortcut: 'Ctrl+O', action: triggerOpenFile },
    { id: 'open-folder', label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: triggerOpenFolder },
    { id: 'open-workspace', label: 'Open Workspace from File...', action: triggerOpenFile },
    { id: 'open-recent', label: 'Open Recent', children: recentItems },
    { id: 'sep-workspace', separator: true },
    { id: 'add-folder', label: 'Add Folder to Workspace...', action: triggerAddFolder },
    { id: 'save-workspace-as', label: 'Save Workspace As...', action: () => notify('Workspace saved in this browser session', 'success') },
    { id: 'duplicate-workspace', label: 'Duplicate Workspace', action: openNewWindow },
    { id: 'sep-save', separator: true },
    { id: 'save', label: 'Save', shortcut: 'Ctrl+S', disabled: !hasActiveTab || !activeTab?.isDirty, action: saveActiveFile },
    { id: 'save-as', label: 'Save As...', shortcut: 'Ctrl+Shift+S', disabled: !hasActiveTab, action: saveActiveFileAs },
    { id: 'save-all', label: 'Save All', shortcut: 'Ctrl+K S', disabled: !hasDirtyTabs, action: saveAllFiles },
    { id: 'sep-share', separator: true },
    { id: 'share', label: 'Share', children: [
      { id: 'share-copy-link', label: 'Copy Workspace Link', action: shareWorkspace },
      { id: 'share-native', label: 'Share...', action: async () => {
        if (navigator.share) {
          await navigator.share({ title: 'AI Web IDE', url: window.location.href });
        } else {
          await shareWorkspace();
        }
      } },
    ] },
    { id: 'sep-settings', separator: true },
    { id: 'auto-save', label: 'Auto Save', checked: settings.autoSave, action: toggleAutoSave },
    { id: 'preferences', label: 'Preferences', children: [
      { id: 'pref-settings', label: 'Settings', action: () => showPreferences('Settings') },
      { id: 'pref-theme', label: 'Color Theme', action: () => showPreferences('Color Theme') },
      { id: 'pref-shortcuts', label: 'Keyboard Shortcuts', action: () => showPreferences('Keyboard Shortcuts') },
    ] },
    { id: 'sep-close', separator: true },
    { id: 'revert-file', label: 'Revert File', disabled: !activeTab?.isDirty, action: () => notify('Revert is unavailable for local unsaved edits', 'warning') },
    { id: 'close-editor', label: 'Close Editor', shortcut: 'Ctrl+F4', disabled: !hasActiveTab, action: closeActiveEditor },
    { id: 'close-window', label: 'Close Window', shortcut: 'Alt+F4', action: closeWindow },
    { id: 'sep-exit', separator: true },
    { id: 'exit', label: 'Exit', action: closeWindow },
  ];

  const editMenuItems: FileMenuItem[] = [
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: !hasActiveTab, action: () => runEditorCommand('undo') },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: !hasActiveTab, action: () => runEditorCommand('redo') },
    { id: 'sep-clipboard', separator: true },
    { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: !hasActiveTab, action: () => runEditorCommand('cut') },
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: !hasActiveTab, action: () => runEditorCommand('copy') },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: !hasActiveTab, action: () => runEditorCommand('paste') },
    { id: 'sep-find-editor', separator: true },
    { id: 'find', label: 'Find', shortcut: 'Ctrl+F', disabled: !hasActiveTab, action: () => runEditorCommand('find') },
    { id: 'replace', label: 'Replace', shortcut: 'Ctrl+H', disabled: !hasActiveTab, action: () => runEditorCommand('replace') },
    { id: 'sep-find-files', separator: true },
    { id: 'find-files', label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: () => openWorkspaceSearch(false) },
    { id: 'replace-files', label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', action: () => openWorkspaceSearch(true) },
    { id: 'sep-comments', separator: true },
    { id: 'line-comment', label: 'Toggle Line Comment', shortcut: 'Ctrl+/', disabled: !hasActiveTab, action: () => runEditorCommand('line-comment') },
    { id: 'block-comment', label: 'Toggle Block Comment', shortcut: 'Shift+Alt+A', disabled: !hasActiveTab, action: () => runEditorCommand('block-comment') },
    { id: 'emmet-expand', label: 'Emmet: Expand Abbreviation', shortcut: 'Tab', disabled: !hasActiveTab, action: () => runEditorCommand('emmet-expand') },
  ];

  const selectionMenuItems: FileMenuItem[] = [
    { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', disabled: !hasActiveTab, action: () => runEditorCommand('select-all') },
    { id: 'expand-selection', label: 'Expand Selection', shortcut: 'Shift+Alt+RightArrow', disabled: !hasActiveTab, action: () => runEditorCommand('expand-selection') },
    { id: 'shrink-selection', label: 'Shrink Selection', shortcut: 'Shift+Alt+LeftArrow', disabled: !hasActiveTab, action: () => runEditorCommand('shrink-selection') },
    { id: 'sep-lines', separator: true },
    { id: 'copy-line-up', label: 'Copy Line Up', shortcut: 'Shift+Alt+UpArrow', disabled: !hasActiveTab, action: () => runEditorCommand('copy-line-up') },
    { id: 'copy-line-down', label: 'Copy Line Down', shortcut: 'Shift+Alt+DownArrow', disabled: !hasActiveTab, action: () => runEditorCommand('copy-line-down') },
    { id: 'move-line-up', label: 'Move Line Up', shortcut: 'Alt+UpArrow', disabled: !hasActiveTab, action: () => runEditorCommand('move-line-up') },
    { id: 'move-line-down', label: 'Move Line Down', shortcut: 'Alt+DownArrow', disabled: !hasActiveTab, action: () => runEditorCommand('move-line-down') },
    { id: 'duplicate-selection', label: 'Duplicate Selection', disabled: !hasActiveTab, action: () => runEditorCommand('duplicate-selection') },
    { id: 'sep-cursors', separator: true },
    { id: 'cursor-above', label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+UpArrow', disabled: !hasActiveTab, action: () => runEditorCommand('cursor-above') },
    { id: 'cursor-below', label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+DownArrow', disabled: !hasActiveTab, action: () => runEditorCommand('cursor-below') },
    { id: 'cursors-line-ends', label: 'Add Cursors to Line Ends', shortcut: 'Shift+Alt+I', disabled: !hasActiveTab, action: () => runEditorCommand('cursors-line-ends') },
    { id: 'add-next-occurrence', label: 'Add Next Occurrence', shortcut: 'Ctrl+D', disabled: !hasActiveTab, action: () => runEditorCommand('add-next-occurrence') },
    { id: 'add-previous-occurrence', label: 'Add Previous Occurrence', disabled: !hasActiveTab, action: () => runEditorCommand('add-previous-occurrence') },
    { id: 'select-all-occurrences', label: 'Select All Occurrences', shortcut: 'Ctrl+Shift+L', disabled: !hasActiveTab, action: () => runEditorCommand('select-all-occurrences') },
    { id: 'sep-modes', separator: true },
    { id: 'multi-cursor-modifier', label: 'Switch to Ctrl+Click for Multi-Cursor', disabled: !hasActiveTab, action: () => runEditorCommand('multi-cursor-modifier') },
    { id: 'column-selection-mode', label: 'Column Selection Mode', disabled: !hasActiveTab, action: () => runEditorCommand('column-selection-mode') },
  ];

  const viewMenuItems: FileMenuItem[] = [
    { id: 'command-palette', label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: toggleCommandPalette },
    { id: 'open-view', label: 'Open View...', action: toggleCommandPalette },
    { id: 'sep-appearance', separator: true },
    { id: 'appearance', label: 'Appearance', children: [
      { id: 'appearance-activitybar', label: 'Activity Bar', checked: activityBarVisible, action: () => setActivityBarVisible(!useUIStore.getState().activityBarVisible) },
      { id: 'appearance-sidebar', label: 'Primary Side Bar', checked: sidebarVisible, action: () => setSidebarVisible(!useUIStore.getState().sidebarVisible) },
      { id: 'appearance-panel', label: 'Toggle Panel', checked: bottomPanelVisible, action: () => setBottomPanelVisible(!useUIStore.getState().bottomPanelVisible) },
    { id: 'appearance-secondary', label: 'AI Pair Programmer', checked: rightPanelVisible, action: () => setRightPanelVisible(!useUIStore.getState().rightPanelVisible) },
      { id: 'appearance-statusbar', label: 'Status Bar', checked: statusBarVisible, action: () => setStatusBarVisible(!useUIStore.getState().statusBarVisible) },
      { id: 'appearance-centered', label: 'Centered Layout', checked: centeredLayout, action: () => setCenteredLayout(!useUIStore.getState().centeredLayout) },
    ] },
    { id: 'editor-layout', label: 'Editor Layout', children: [
      { id: 'layout-single', label: 'Single', checked: !splitConfig.enabled, action: () => setSplitConfig({ enabled: false }) },
      { id: 'layout-split-right', label: 'Split Right', checked: splitConfig.enabled && splitConfig.direction === 'vertical', action: () => setSplitConfig({ enabled: true, direction: 'vertical' }) },
      { id: 'layout-split-down', label: 'Split Down', checked: splitConfig.enabled && splitConfig.direction === 'horizontal', action: () => setSplitConfig({ enabled: true, direction: 'horizontal' }) },
    ] },
    { id: 'sep-sidebar', separator: true },
    { id: 'explorer', label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => showSidebarPanel('explorer') },
    { id: 'search', label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => showSidebarPanel('search') },
    { id: 'source-control', label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => showSidebarPanel('git') },
    { id: 'run', label: 'Run', shortcut: 'Ctrl+Shift+D', action: () => showSidebarPanel('debug') },
    { id: 'extensions', label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => showSidebarPanel('extensions') },
    { id: 'sep-aux', separator: true },
    { id: 'chat', label: 'AI Pair Programmer', shortcut: 'Ctrl+Alt+I', action: () => setRightPanelVisible(true) },
    { id: 'browser', label: 'Browser', shortcut: 'Ctrl+Alt+/', action: openBrowserView },
    { id: 'sep-panel', separator: true },
    { id: 'problems', label: 'Problems', shortcut: 'Ctrl+Shift+M', action: () => showBottomPanel('problems') },
    { id: 'output', label: 'Output', shortcut: 'Ctrl+Shift+U', action: () => showBottomPanel('output') },
    { id: 'debug-console', label: 'Debug Console', shortcut: 'Ctrl+Shift+Y', action: () => showBottomPanel('debug') },
    { id: 'terminal', label: 'Terminal', shortcut: 'Ctrl+`', action: () => showBottomPanel('terminal') },
    { id: 'sep-word-wrap', separator: true },
    { id: 'word-wrap', label: 'Word Wrap', shortcut: 'Alt+Z', checked: settings.wordWrap === 'on', action: toggleWordWrap },
  ];

  const goMenuItems: FileMenuItem[] = [
    { id: 'back', label: 'Back', shortcut: 'Alt+LeftArrow', action: goBack },
    { id: 'forward', label: 'Forward', shortcut: 'Alt+RightArrow', disabled: true, action: goForward },
    { id: 'last-edit-location', label: 'Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q', disabled: !hasActiveTab, action: () => runEditorCommand('last-edit-location') },
    { id: 'sep-switch', separator: true },
    { id: 'switch-editor', label: 'Switch Editor', children: [
      { id: 'switch-next-editor', label: 'Next Editor', action: () => notify('Next editor selected', 'info') },
      { id: 'switch-previous-editor', label: 'Previous Editor', action: () => notify('Previous editor selected', 'info') },
      { id: 'switch-first-editor', label: 'First Editor', action: () => tabs[0] && useEditorStore.getState().setActiveTab(tabs[0].id) },
    ] },
    { id: 'switch-group', label: 'Switch Group', children: [
      { id: 'focus-first-group', label: 'First Group', action: () => setSplitConfig({ enabled: false }) },
      { id: 'split-editor-right', label: 'Split Right', action: () => setSplitConfig({ enabled: true, direction: 'vertical' }) },
      { id: 'split-editor-down', label: 'Split Down', action: () => setSplitConfig({ enabled: true, direction: 'horizontal' }) },
    ] },
    { id: 'sep-symbols', separator: true },
    { id: 'go-file', label: 'Go to File...', shortcut: 'Ctrl+P', action: toggleCommandPalette },
    { id: 'go-workspace-symbol', label: 'Go to Symbol in Workspace...', shortcut: 'Ctrl+T', action: toggleCommandPalette },
    { id: 'sep-editor-symbols', separator: true },
    { id: 'go-editor-symbol', label: 'Go to Symbol in Editor...', shortcut: 'Ctrl+Shift+O', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-symbol') },
    { id: 'go-definition', label: 'Go to Definition', shortcut: 'F12', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-definition') },
    { id: 'go-declaration', label: 'Go to Declaration', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-declaration') },
    { id: 'go-type-definition', label: 'Go to Type Definition', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-type-definition') },
    { id: 'go-implementations', label: 'Go to Implementations', shortcut: 'Ctrl+F12', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-implementation') },
    { id: 'go-references', label: 'Go to References', shortcut: 'Shift+F12', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-references') },
    { id: 'sep-line', separator: true },
    { id: 'go-line-column', label: 'Go to Line/Column...', shortcut: 'Ctrl+G', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-line') },
    { id: 'go-bracket', label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', disabled: !hasActiveTab, action: () => runEditorCommand('go-to-bracket') },
    { id: 'sep-problems', separator: true },
    { id: 'next-problem', label: 'Next Problem', shortcut: 'F8', action: () => { showBottomPanel('problems'); runEditorCommand('next-problem'); } },
    { id: 'previous-problem', label: 'Previous Problem', shortcut: 'Shift+F8', action: () => { showBottomPanel('problems'); runEditorCommand('previous-problem'); } },
    { id: 'sep-changes', separator: true },
    { id: 'next-change', label: 'Next Change', shortcut: 'Alt+F3', action: () => { showSidebarPanel('git'); notify('Next change selected', 'info'); } },
    { id: 'previous-change', label: 'Previous Change', shortcut: 'Shift+Alt+F3', action: () => { showSidebarPanel('git'); notify('Previous change selected', 'info'); } },
  ];

  const runMenuItems: FileMenuItem[] = [
    { id: 'start-debugging', label: 'Start Debugging', shortcut: 'F5', action: startDebugging },
    { id: 'run-without-debugging', label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: runWithoutDebugging },
    { id: 'stop-debugging', label: 'Stop Debugging', shortcut: 'Shift+F5', disabled: true, action: () => notify('No active debug session to stop', 'warning') },
    { id: 'restart-debugging', label: 'Restart Debugging', shortcut: 'Ctrl+Shift+F5', disabled: true, action: () => notify('No active debug session to restart', 'warning') },
    { id: 'sep-config', separator: true },
    { id: 'open-configurations', label: 'Open Configurations', disabled: true, action: addDebugConfiguration },
    { id: 'add-configuration', label: 'Add Configuration...', action: addDebugConfiguration },
    { id: 'sep-step', separator: true },
    { id: 'step-over', label: 'Step Over', shortcut: 'F10', disabled: true, action: () => notify('Start debugging before stepping', 'warning') },
    { id: 'step-into', label: 'Step Into', shortcut: 'F11', disabled: true, action: () => notify('Start debugging before stepping', 'warning') },
    { id: 'step-out', label: 'Step Out', shortcut: 'Shift+F11', disabled: true, action: () => notify('Start debugging before stepping', 'warning') },
    { id: 'continue', label: 'Continue', shortcut: 'F5', disabled: true, action: () => notify('No paused debug session', 'warning') },
    { id: 'sep-breakpoint', separator: true },
    { id: 'toggle-breakpoint', label: 'Toggle Breakpoint', shortcut: 'F9', disabled: !hasActiveTab, action: () => runEditorCommand('toggle-breakpoint') },
    { id: 'new-breakpoint', label: 'New Breakpoint', children: [
      { id: 'breakpoint-current-line', label: 'Current Line', disabled: !hasActiveTab, action: () => runEditorCommand('toggle-breakpoint') },
      { id: 'breakpoint-line', label: 'Line Breakpoint...', disabled: !hasActiveTab, action: () => runEditorCommand('new-line-breakpoint') },
      { id: 'breakpoint-function', label: 'Function Breakpoint...', action: () => notify('Function breakpoints need a debug adapter configuration', 'warning') },
    ] },
    { id: 'sep-breakpoint-actions', separator: true },
    { id: 'enable-breakpoints', label: 'Enable All Breakpoints', disabled: !hasActiveTab, action: () => runEditorCommand('enable-breakpoints') },
    { id: 'disable-breakpoints', label: 'Disable All Breakpoints', disabled: !hasActiveTab, action: () => runEditorCommand('disable-breakpoints') },
    { id: 'remove-breakpoints', label: 'Remove All Breakpoints', disabled: !hasActiveTab, action: () => runEditorCommand('remove-breakpoints') },
    { id: 'sep-debuggers', separator: true },
    { id: 'install-debuggers', label: 'Install Additional Debuggers...', action: installAdditionalDebuggers },
  ];

  const terminalMenuItems: FileMenuItem[] = [
    { id: 'new-terminal', label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: newTerminal },
    { id: 'split-terminal', label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: splitTerminal },
    { id: 'new-terminal-window', label: 'New Terminal Window', shortcut: 'Ctrl+Shift+Alt+`', action: newTerminalWindow },
    { id: 'sep-run-task', separator: true },
    { id: 'run-task', label: 'Run Task...', action: () => runTerminalCommand('npm run dev') },
    { id: 'run-build-task', label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: () => runTerminalCommand('npm run build') },
    { id: 'run-active-file', label: 'Run Active File', disabled: !hasActiveTab, action: runActiveFile },
    { id: 'run-selected-text', label: 'Run Selected Text', disabled: !hasActiveTab, action: () => { showBottomPanel('terminal'); runEditorCommand('run-selected-text'); } },
    { id: 'sep-running', separator: true },
    { id: 'show-running-tasks', label: 'Show Running Tasks...', disabled: true, action: () => notify('No running tasks', 'info') },
    { id: 'restart-running-task', label: 'Restart Running Task...', disabled: true, action: () => notify('No running task to restart', 'warning') },
    { id: 'terminate-task', label: 'Terminate Task...', disabled: true, action: () => notify('No running task to terminate', 'warning') },
    { id: 'sep-configure', separator: true },
    { id: 'configure-tasks', label: 'Configure Tasks...', action: () => notify('Create tasks.json support is not configured yet', 'info') },
    { id: 'configure-default-build-task', label: 'Configure Default Build Task...', action: () => notify('Default build task is npm run build', 'info') },
  ];

  const helpMenuItems: FileMenuItem[] = [
    { id: 'welcome', label: 'Welcome', action: () => notify('Welcome to AI Web IDE', 'info') },
    { id: 'show-all-commands', label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: toggleCommandPalette },
    { id: 'documentation', label: 'Documentation', action: () => openHelpUrl('https://code.visualstudio.com/docs', 'Documentation') },
    { id: 'editor-playground', label: 'Editor Playground', action: () => openHelpUrl('https://microsoft.github.io/monaco-editor/playground.html', 'Editor Playground') },
    { id: 'open-walkthrough', label: 'Open Walkthrough...', action: () => notify('Walkthroughs are not bundled in this web IDE yet', 'info') },
    { id: 'release-notes', label: 'Show Release Notes', action: () => openHelpUrl('https://code.visualstudio.com/updates', 'Release notes') },
    { id: 'accessibility', label: 'Get Started with Accessibility Features', action: () => openHelpUrl('https://code.visualstudio.com/docs/editor/accessibility', 'Accessibility guide') },
    { id: 'ask-vscode', label: 'Ask @vscode', action: () => openHelpUrl('https://github.com/microsoft/vscode/discussions', 'VS Code discussions') },
    { id: 'sep-learning', separator: true },
    { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', action: () => openHelpUrl('https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf', 'Keyboard shortcuts') },
    { id: 'video-tutorials', label: 'Video Tutorials', action: () => openHelpUrl('https://code.visualstudio.com/docs/getstarted/introvideos', 'Video tutorials') },
    { id: 'tips-tricks', label: 'Tips and Tricks', action: () => openHelpUrl('https://code.visualstudio.com/docs/getstarted/tips-and-tricks', 'Tips and tricks') },
    { id: 'sep-community', separator: true },
    { id: 'youtube', label: 'Join Us on YouTube', action: () => openHelpUrl('https://www.youtube.com/@code', 'YouTube') },
    { id: 'feature-requests', label: 'Search Feature Requests', action: () => openHelpUrl('https://github.com/microsoft/vscode/issues', 'Feature requests') },
    { id: 'report-issue', label: 'Report Issue', action: () => openHelpUrl('https://github.com/microsoft/vscode/issues/new/choose', 'Report issue') },
    { id: 'sep-legal', separator: true },
    { id: 'license', label: 'View License', action: () => openHelpUrl('https://code.visualstudio.com/license', 'License') },
    { id: 'privacy', label: 'Privacy Statement', action: () => openHelpUrl('https://privacy.microsoft.com/privacystatement', 'Privacy statement') },
    { id: 'sep-tools', separator: true },
    { id: 'devtools', label: 'Toggle Developer Tools', action: () => notify('Use the browser menu or F12 to open Developer Tools', 'info') },
    { id: 'process-explorer', label: 'Open Process Explorer', action: () => notify('Process Explorer is not available in the browser runtime', 'info') },
    { id: 'sep-updates', separator: true },
    { id: 'updates', label: 'Check for Updates...', action: () => notify('AI Web IDE is up to date in this workspace', 'success') },
    { id: 'sep-about', separator: true },
    { id: 'about', label: 'About', action: () => notify('AI Web IDE - VS Code style web editor', 'info') },
  ];

  const overflowMenuItems: FileMenuItem[] = [
    { id: 'terminal-menu', label: 'Terminal', childWidth: 486, children: terminalMenuItems },
    { id: 'help-menu', label: 'Help', childWidth: 540, children: helpMenuItems },
  ];

  const runMenuItem = (item: FileMenuItem) => {
    if (item.disabled || item.children) return;
    item.action?.();
    setActiveMenu(null);
    setOpenSubmenu(null);
  };

  return (
    <div
      className="flex h-[52px] flex-shrink-0 flex-col no-select"
      style={{ background: 'var(--color-titleBar)', borderBottom: '1px solid var(--color-border)' }}
    >
      <input ref={openFileInputRef} type="file" multiple className="hidden" onChange={handleOpenFiles} />
      <input ref={openFolderInputRef} type="file" multiple className="hidden" onChange={handleOpenFolder} {...{ webkitdirectory: '' }} />

      <div className="flex h-[52px] items-center px-3 text-[13px]" style={{ color: 'var(--color-textMuted)' }}>
        <div className="flex w-[520px] items-center gap-5">
          <VSCodeLogo className="h-[25px] w-[25px] flex-shrink-0" />

          <div ref={menuRef} className="flex items-center gap-1">
            {menus.map((menu) => (
              <div key={menu.label} className="relative">
                <button
                  className="rounded px-2 py-1 text-[18px] leading-none transition-colors hover:bg-white/10"
                  style={{ background: activeMenu === menu.label ? '#2a2a2a' : 'transparent' }}
                  onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                  onClick={() => {
                    setActiveMenu(activeMenu === menu.label ? null : menu.label);
                    setOpenSubmenu(null);
                  }}
                >
                  {menu.label}
                </button>

                {activeMenu === menu.label && (
                  menu.label === 'File' ? (
                    <FileDropdown items={fileMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} />
                  ) : menu.label === 'Edit' ? (
                    <FileDropdown items={editMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={468} />
                  ) : menu.label === 'Selection' ? (
                    <FileDropdown items={selectionMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={505} />
                  ) : menu.label === 'View' ? (
                    <FileDropdown items={viewMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={430} />
                  ) : menu.label === 'Go' ? (
                    <FileDropdown items={goMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={466} />
                  ) : menu.label === 'Run' ? (
                    <FileDropdown items={runMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={438} />
                  ) : (
                    <SimpleDropdown items={menu.items} />
                  )
                )}
              </div>
            ))}
            <div className="relative">
              <button
                className="rounded px-2 py-1 text-[18px] leading-none hover:bg-white/10"
                style={{ background: activeMenu === 'More' ? '#2a2a2a' : 'transparent' }}
                onMouseEnter={() => activeMenu && setActiveMenu('More')}
                onClick={() => {
                  setActiveMenu(activeMenu === 'More' ? null : 'More');
                  setOpenSubmenu(null);
                }}
              >
                ...
              </button>

              {activeMenu === 'More' && (
                <FileDropdown items={overflowMenuItems} openSubmenu={openSubmenu} setOpenSubmenu={setOpenSubmenu} onRun={runMenuItem} width={230} />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center gap-3">
          <button onClick={goBack} className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10" title="Go Back">
            <ArrowLeft size={20} />
          </button>
          <button onClick={goForward} className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10" title="Go Forward">
            <ArrowRight size={20} />
          </button>
          <button
            onClick={toggleCommandPalette}
            className="flex h-[36px] w-[730px] max-w-[42vw] items-center rounded-[8px] border px-4 text-left text-[18px] hover:bg-white/[0.08]"
            style={{ background: '#262626', borderColor: '#333333', color: '#9a9a9a' }}
            title="Search"
          >
            <Search size={18} className="mr-3 opacity-0" />
            <span>Search</span>
            <MessageSquarePlus size={19} className="ml-auto" />
            <ChevronDown size={18} className="ml-3" />
          </button>
        </div>

        <div className="flex w-[520px] items-center justify-end gap-4">
          <Bot size={24} />
          <div className="h-7 w-px bg-white/20" />
          <TitleIconButton
            title="Toggle Primary Side Bar"
            active={sidebarVisible}
            onClick={() => setSidebarVisible(!useUIStore.getState().sidebarVisible)}
          >
            <LayoutPanelLeft size={24} />
          </TitleIconButton>
          <div className="relative" ref={layoutMenuRef}>
            <TitleIconButton
              title="Customize Layout"
              active={layoutMenuOpen}
              onClick={() => {
                setLayoutMenuOpen((open) => !open);
                setActiveMenu(null);
                setOpenSubmenu(null);
              }}
            >
              <Sidebar size={24} />
            </TitleIconButton>
            {layoutMenuOpen && (
              <CustomizeLayoutMenu
                activityBarVisible={activityBarVisible}
                sidebarVisible={sidebarVisible}
                bottomPanelVisible={bottomPanelVisible}
                rightPanelVisible={rightPanelVisible}
                statusBarVisible={statusBarVisible}
                centeredLayout={centeredLayout}
                splitConfig={splitConfig}
                onToggleActivityBar={() => setActivityBarVisible(!useUIStore.getState().activityBarVisible)}
                onToggleSidebar={() => setSidebarVisible(!useUIStore.getState().sidebarVisible)}
                onTogglePanel={() => setBottomPanelVisible(!useUIStore.getState().bottomPanelVisible)}
                onToggleRightPanel={() => setRightPanelVisible(!useUIStore.getState().rightPanelVisible)}
                onToggleStatusBar={() => setStatusBarVisible(!useUIStore.getState().statusBarVisible)}
                onToggleCentered={() => setCenteredLayout(!useUIStore.getState().centeredLayout)}
                onSingleEditor={() => setSplitConfig({ enabled: false })}
                onSplitRight={() => setSplitConfig({ enabled: true, direction: 'vertical' })}
                onSplitDown={() => setSplitConfig({ enabled: true, direction: 'horizontal' })}
              />
            )}
          </div>
          <TitleIconButton
            title="Toggle Panel"
            active={bottomPanelVisible}
            onClick={() => setBottomPanelVisible(!useUIStore.getState().bottomPanelVisible)}
          >
            <LayoutPanelTop size={24} />
          </TitleIconButton>
          <TitleIconButton
            title="Toggle Editor Split"
            active={splitConfig.enabled}
            onClick={() => setSplitConfig(splitConfig.enabled ? { enabled: false } : { enabled: true, direction: 'vertical' })}
          >
            <Columns size={24} />
          </TitleIconButton>
          <div className="mx-3 h-7 w-px bg-white/20" />
          <Minus size={21} />
          <Square size={20} />
          <Maximize2 size={20} />
          <X size={22} />
        </div>
      </div>

      <div className="pointer-events-none absolute right-5 top-[66px] flex items-center gap-5" style={{ color: 'var(--color-textMuted)' }}>
        <Sparkles size={25} style={{ color: '#e26d3d' }} />
        <Bot size={25} style={{ color: '#f2f2f2' }} />
        <Sidebar size={24} style={{ color: '#8fb9e8' }} />
        <MoreHorizontal size={24} />
      </div>
    </div>
  );
}

function SimpleDropdown({ items }: { items: MenuSubItem[] }) {
  return (
    <div
      className="absolute left-0 top-full z-50 min-w-56 rounded py-1 text-[13px] shadow-2xl"
      style={{ background: '#252526', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
    >
      {items.map((item, index) =>
        item.separator ? (
          <div key={index} className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
        ) : (
          <button key={index} className="flex w-full items-center justify-between gap-8 px-4 py-1.5 text-left hover:bg-white/10">
            <span>{item.label}</span>
            {item.shortcut && <span style={{ color: 'var(--color-textMuted)' }}>{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}

function TitleIconButton({
  children,
  title,
  active,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-white/10"
      style={{ color: active ? '#ffffff' : 'var(--color-textMuted)', background: active ? 'rgba(255,255,255,0.08)' : 'transparent' }}
    >
      {children}
    </button>
  );
}

function CustomizeLayoutMenu({
  activityBarVisible,
  sidebarVisible,
  bottomPanelVisible,
  rightPanelVisible,
  statusBarVisible,
  centeredLayout,
  splitConfig,
  onToggleActivityBar,
  onToggleSidebar,
  onTogglePanel,
  onToggleRightPanel,
  onToggleStatusBar,
  onToggleCentered,
  onSingleEditor,
  onSplitRight,
  onSplitDown,
}: {
  activityBarVisible: boolean;
  sidebarVisible: boolean;
  bottomPanelVisible: boolean;
  rightPanelVisible: boolean;
  statusBarVisible: boolean;
  centeredLayout: boolean;
  splitConfig: { enabled: boolean; direction: 'horizontal' | 'vertical'; ratio: number };
  onToggleActivityBar: () => void;
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onToggleRightPanel: () => void;
  onToggleStatusBar: () => void;
  onToggleCentered: () => void;
  onSingleEditor: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[322px] rounded-[8px] py-2 text-[14px] shadow-2xl"
      style={{ background: '#1f2020', border: '1px solid #303234', color: '#d7d7d7', boxShadow: '0 8px 28px rgba(0,0,0,.55)' }}
    >
      <div className="px-3 pb-2 text-[12px] uppercase" style={{ color: '#9a9a9a' }}>Customize Layout</div>
      <LayoutMenuItem label="Activity Bar" checked={activityBarVisible} onClick={onToggleActivityBar} />
      <LayoutMenuItem label="Primary Side Bar" checked={sidebarVisible} onClick={onToggleSidebar} />
      <LayoutMenuItem label="AI Pair Programmer" checked={rightPanelVisible} onClick={onToggleRightPanel} />
      <LayoutMenuItem label="Panel" checked={bottomPanelVisible} onClick={onTogglePanel} />
      <LayoutMenuItem label="Status Bar" checked={statusBarVisible} onClick={onToggleStatusBar} />
      <LayoutMenuItem label="Centered Layout" checked={centeredLayout} onClick={onToggleCentered} />
      <div className="my-2 h-px" style={{ background: '#303234' }} />
      <div className="px-3 pb-1 text-[12px] uppercase" style={{ color: '#9a9a9a' }}>Editor Layout</div>
      <LayoutMenuItem label="Single" checked={!splitConfig.enabled} onClick={onSingleEditor} />
      <LayoutMenuItem label="Split Right" checked={splitConfig.enabled && splitConfig.direction === 'vertical'} onClick={onSplitRight} />
      <LayoutMenuItem label="Split Down" checked={splitConfig.enabled && splitConfig.direction === 'horizontal'} onClick={onSplitDown} />
    </div>
  );
}

function LayoutMenuItem({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      className="grid h-[32px] w-full grid-cols-[28px_1fr] items-center px-3 text-left hover:bg-[#04395e]"
      onClick={onClick}
    >
      <span className="flex items-center justify-center">{checked && <Check size={16} />}</span>
      <span>{label}</span>
    </button>
  );
}

function FileDropdown({
  items,
  openSubmenu,
  setOpenSubmenu,
  onRun,
  width = 446,
}: {
  items: FileMenuItem[];
  openSubmenu: string | null;
  setOpenSubmenu: (id: string | null) => void;
  onRun: (item: FileMenuItem) => void;
  width?: number;
}) {
  return (
    <div
      className="absolute left-0 top-full z-50 rounded-[10px] py-[9px] text-[20px] shadow-2xl"
      style={{ width, background: '#1f2020', border: '1px solid #303234', color: '#d7d7d7', boxShadow: '0 8px 28px rgba(0,0,0,.55)' }}
    >
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="my-[8px] h-px" style={{ background: '#2d2f31' }} />;
        }

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpenSubmenu(item.children ? item.id : null)}
          >
            <button
              className="grid h-[36px] w-full grid-cols-[34px_minmax(0,1fr)_auto_22px] items-center px-[16px] text-left leading-none transition-colors hover:bg-[#04395e]"
              style={{ color: item.disabled ? '#686868' : '#d7d7d7' }}
              onClick={() => onRun(item)}
              disabled={item.disabled}
            >
              <span className="flex items-center justify-center">
                {item.checked && <Check size={20} strokeWidth={1.6} />}
              </span>
              <span className="truncate">{item.label}</span>
              <span className="pl-5 text-right text-[20px]" style={{ color: item.disabled ? '#686868' : '#9a9a9a' }}>
                {item.shortcut}
              </span>
              <span className="flex justify-end">
                {item.children && <ChevronRight size={21} strokeWidth={1.6} style={{ color: '#8d8d8d' }} />}
              </span>
            </button>

            {item.children && openSubmenu === item.id && (
              <div
                className="absolute left-[calc(100%-4px)] top-0 z-50 w-[265px] rounded-[9px] py-2 text-[18px] shadow-2xl"
                style={{ width: item.childWidth || 265, background: '#1f2020', border: '1px solid #303234', color: '#d7d7d7' }}
              >
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    className="grid h-[34px] w-full grid-cols-[22px_1fr] items-center px-3 text-left hover:bg-[#04395e]"
                    onClick={() => onRun(child)}
                    disabled={child.disabled}
                    style={{ color: child.disabled ? '#686868' : '#d7d7d7' }}
                  >
                    <span>{child.checked && <Check size={17} />}</span>
                    <span className="truncate">{child.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function buildFolderTree(files: File[]): Promise<FileNode[]> {
  const root: FileNode = {
    id: `folder-root-${Date.now()}`,
    name: files[0]?.webkitRelativePath?.split('/')[0] || 'Opened Folder',
    path: '/local-folder',
    type: 'directory',
    children: [],
  };

  files.forEach((file) => {
    const relativePath = file.webkitRelativePath || file.name;
    const parts = relativePath.split('/').filter(Boolean);
    let current = root;

    parts.slice(1, -1).forEach((part, index) => {
      current.children ||= [];
      let folder = current.children.find((child) => child.type === 'directory' && child.name === part);
      if (!folder) {
        folder = {
          id: `folder-${relativePath}-${index}`,
          name: part,
          path: `${current.path}/${part}`,
          type: 'directory',
          children: [],
        };
        current.children.push(folder);
      }
      current = folder;
    });

    const name = parts[parts.length - 1] || file.name;
    const path = `/local-folder/${relativePath}`;
    browserFileCache.register(path, file);
    current.children ||= [];
    current.children.push({
      id: `folder-file-${relativePath}`,
      name,
      path,
      type: 'file',
      extension: name.split('.').pop(),
      language: fileService.getLanguageFromExtension(name),
      size: file.size,
      lastModified: file.lastModified,
    });
  });

  return [root];
}

function createWorkspaceDescriptor(name: string, path: string) {
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    path,
    createdAt: Date.now(),
    lastOpenedAt: Date.now(),
    recentFiles: [],
    settings: {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      formatOnSave: true,
      aiEnabled: true,
      terminalShell: '/bin/bash',
    },
  };
}

function buildClonedRepositoryTree(repoName: string): FileNode[] {
  return [
    {
      id: `repo-root-${Date.now()}`,
      name: repoName,
      path: `/cloned/${repoName}`,
      type: 'directory',
      children: [
        {
          id: `repo-readme-${Date.now()}`,
          name: 'README.md',
          path: `/cloned/${repoName}/README.md`,
          type: 'file',
          extension: 'md',
          language: 'markdown',
        },
        {
          id: `repo-gitignore-${Date.now()}`,
          name: '.gitignore',
          path: `/cloned/${repoName}/.gitignore`,
          type: 'file',
          extension: 'gitignore',
          language: 'plaintext',
        },
      ],
    },
  ];
}

function VSCodeLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#22a6f2"
        d="M17.9 2.2 8.9 10.4 3.5 6.3 1.6 7.4v9.2l1.9 1.1 5.4-4.1 9 8.2 4.5-1.8V4L17.9 2.2Zm.1 5.5v8.6l-5.8-4.3L18 7.7ZM4.3 9.5l3.1 2.5-3.1 2.5v-5Z"
      />
    </svg>
  );
}
