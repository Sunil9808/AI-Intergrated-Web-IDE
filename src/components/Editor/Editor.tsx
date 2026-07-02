import { useCallback } from 'react';
import EditorTabs from './EditorTabs';
import Breadcrumbs from './Breadcrumbs';
import MonacoEditor from './MonacoEditor';
import ThunderRequestEditor from './ThunderRequestEditor';
import ExtensionDetailEditor from './ExtensionDetailEditor';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { fileService } from '../../services/fileService';
import { FileNode } from '../../types/file.types';
import {
  Bot,
  Check,
  Code2,
  FilePlus2,
  FolderOpen,
  GitBranch,
  Lightbulb,
  MessageSquarePlus,
  Network,
  Star,
  X,
} from 'lucide-react';

type StartActionId = 'new-file' | 'open-file' | 'open-folder' | 'clone' | 'connect' | 'generate-workspace';

const startItems: Array<{ id: StartActionId; label: string; icon: typeof FilePlus2 }> = [
  { id: 'new-file', label: 'New File...', icon: FilePlus2 },
  { id: 'open-file', label: 'Open File...', icon: FilePlus2 },
  { id: 'open-folder', label: 'Open Folder...', icon: FolderOpen },
  { id: 'clone', label: 'Clone Git Repository...', icon: GitBranch },
  { id: 'connect', label: 'Connect to...', icon: Code2 },
  { id: 'generate-workspace', label: 'Generate New Workspace...', icon: MessageSquarePlus },
];

const recentItems = [
  ['AI-Web-IDE', 'E:\\'],
  ['class 76', 'E:\\web development'],
  ['class 75', 'E:\\web development'],
  ['web development', 'E:\\'],
  ['Task Managemen', 'C:\\'],
];

const walkthroughs = [
  {
    title: 'Get started with VS Code',
    description: 'Customize your editor, learn the basics, and start coding',
    icon: Star,
    featured: true,
  },
  { title: 'Learn the Fundamentals', icon: Lightbulb, progress: 0.2 },
  { title: 'GitHub Copilot', icon: Bot, badge: 'Updated', progress: 0.4 },
  { title: 'Get started with Claude Code', icon: Star, badge: 'Updated', progress: 0 },
  { title: 'Get Started With GitLens', icon: Network, badge: 'Updated', progress: 0.4 },
];

export default function Editor() {
  const { tabs, activeTabId, getActiveTab, updateTabContent, splitConfig } = useEditorStore();
  const activeTab = getActiveTab();

  const handleContentChange = useCallback((content: string) => {
    if (activeTabId) {
      updateTabContent(activeTabId, content);
    }
  }, [activeTabId, updateTabContent]);

  if (tabs.length === 0) {
    return <WelcomeEditor />;
  }

  const renderActiveEditor = () => {
    if (activeTab?.language === 'thunder-request') {
      return <ThunderRequestEditor tabId={activeTab.id} content={activeTab.content} />;
    }

    if (activeTab?.language === 'extension-detail') {
      return <ExtensionDetailEditor content={activeTab.content} />;
    }

    if (activeTab) {
      return (
        <MonacoEditor
          key={activeTab.id}
          tabId={activeTab.id}
          filePath={activeTab.filePath}
          content={activeTab.content}
          language={activeTab.language}
          onContentChange={handleContentChange}
        />
      );
    }

    return (
      <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-textMuted)', background: 'var(--color-background)' }}>
        Select a file to open
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-background)' }}>
      <EditorTabs />
      {activeTab && !['thunder-request', 'extension-detail'].includes(activeTab.language) && <Breadcrumbs />}
      <div className="flex-1 overflow-hidden">
        {splitConfig.enabled ? (
          <div className={splitConfig.direction === 'vertical' ? 'flex h-full' : 'flex h-full flex-col'}>
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {renderActiveEditor()}
            </div>
            <div
              className="min-h-0 min-w-0 flex-1 overflow-hidden border"
              style={{
                borderColor: 'var(--color-border)',
                borderTopWidth: splitConfig.direction === 'horizontal' ? 1 : 0,
                borderLeftWidth: splitConfig.direction === 'vertical' ? 1 : 0,
              }}
            >
              <div className="flex h-full items-center justify-center text-[13px]" style={{ color: 'var(--color-textMuted)' }}>
                Split editor group
              </div>
            </div>
          </div>
        ) : (
          renderActiveEditor()
        )}
      </div>
    </div>
  );
}

function WelcomeEditor() {
  const openTab = useEditorStore((state) => state.openTab);
  const closeAllTabs = useEditorStore((state) => state.closeAllTabs);
  const setFileTree = useFileStore((state) => state.setFileTree);
  const addFile = useFileStore((state) => state.addFile);
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const { addNotification, setRightPanelVisible, setBottomPanelVisible, setActiveBottomPanel } = useUIStore();

  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addNotification({ type, message });
  };

  const createUntitledFile = () => {
    const timestamp = Date.now();
    openTab({
      id: `tab-untitled-${timestamp}`,
      fileId: `untitled-${timestamp}`,
      filePath: '/untitled/Untitled-1',
      fileName: 'Untitled-1',
      language: 'plaintext',
      content: '',
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify('New text file created', 'success');
  };

  const createNamedFile = () => {
    const fileName = window.prompt('File name', 'new-file.ts')?.trim();
    if (!fileName) return;

    const language = fileService.getLanguageFromExtension(fileName);
    const path = `/workspace/${fileName}`;
    const node: FileNode = {
      id: `welcome-file-${Date.now()}`,
      name: fileName,
      path,
      type: 'file',
      extension: fileName.split('.').pop(),
      language,
      lastModified: Date.now(),
    };
    addFile(node);
    openTab({
      id: `tab-${node.id}`,
      fileId: node.id,
      filePath: path,
      fileName,
      language,
      content: getDefaultContent(fileName, language),
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify(`${fileName} created`, 'success');
  };

  const cloneRepository = () => {
    const repositoryUrl = window.prompt('Repository URL to clone');
    if (!repositoryUrl?.trim()) return;
    const cleanUrl = repositoryUrl.trim();
    const repoName = cleanUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repository';
    window.dispatchEvent(new CustomEvent('ai-web-ide:create-cloned-workspace', {
      detail: { repositoryUrl: cleanUrl, repoName },
    }));
  };

  const createGeneratedWorkspace = () => {
    const projectName = window.prompt('Workspace name', 'generated-workspace')?.trim() || 'generated-workspace';
    const basePath = `/generated/${projectName}`;
    const appPath = `${basePath}/src/App.tsx`;
    const tree = buildGeneratedWorkspaceTree(projectName, basePath, appPath);
    closeAllTabs();
    setWorkspace(createWorkspaceDescriptor(projectName, basePath));
    setFileTree(tree);
    openTab({
      id: `tab-generated-app-${Date.now()}`,
      fileId: tree[0].children?.[1]?.children?.[0]?.id || `generated-app-${Date.now()}`,
      filePath: appPath,
      fileName: 'App.tsx',
      language: 'typescript',
      content: `export default function App() {\n  return <main>Hello from ${projectName}</main>;\n}\n`,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify(`${projectName} workspace generated`, 'success');
  };

  const openRecent = (name: string, path: string) => {
    const readmePath = `${path.replace(/\\$/, '')}/${name}/README.md`.replace(/\\/g, '/');
    const workspacePath = readmePath.replace('/README.md', '');
    const tree = buildRecentWorkspaceTree(name, workspacePath);
    closeAllTabs();
    setWorkspace(createWorkspaceDescriptor(name, workspacePath));
    setFileTree(tree);
    openTab({
      id: `tab-recent-${Date.now()}`,
      fileId: tree[0].children?.[0].id || `recent-readme-${Date.now()}`,
      filePath: readmePath,
      fileName: 'README.md',
      language: 'markdown',
      content: `# ${name}\n\nRecent workspace opened from ${path}.\n`,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify(`Opened ${name}`, 'success');
  };

  const openWalkthrough = (title: string, description?: string) => {
    const content = `# ${title}\n\n${description || 'Use the editor, explorer, terminal, source control, extensions, and AI tools from this workspace.'}\n\n- Create or open files from the Start area.\n- Edit code in Monaco with IntelliSense, find, replace, formatting, minimap, folding, and multi-cursor commands.\n- Use the command palette for workspace commands.\n`;
    openTab({
      id: `tab-walkthrough-${Date.now()}`,
      fileId: `walkthrough-${Date.now()}`,
      filePath: `/walkthroughs/${title}.md`,
      fileName: `${title}.md`,
      language: 'markdown',
      content,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
  };

  const runStartAction = (id: StartActionId) => {
    if (id === 'new-file') createNamedFile();
    if (id === 'open-file') window.dispatchEvent(new CustomEvent('ai-web-ide:open-file'));
    if (id === 'open-folder') window.dispatchEvent(new CustomEvent('ai-web-ide:open-folder', { detail: { mode: 'open' } }));
    if (id === 'clone') cloneRepository();
    if (id === 'connect') {
      setBottomPanelVisible(true);
      setActiveBottomPanel('terminal');
      notify('Terminal connection opened', 'success');
    }
    if (id === 'generate-workspace') createGeneratedWorkspace();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#101112', color: 'var(--color-text)' }}>
      <div className="flex h-[52px] flex-shrink-0 items-end" style={{ background: '#181818', borderBottom: '1px solid var(--color-border)' }}>
        <div
          className="flex h-[52px] w-[180px] items-center gap-2 border-t px-3 text-[20px] italic"
          style={{ background: '#101112', borderColor: '#22a6f2', borderRight: '1px solid var(--color-border)', color: '#d8d8d8' }}
        >
          <VSCodeLogo className="h-[27px] w-[27px] flex-shrink-0 not-italic" />
          <span>Welcome</span>
          <X size={24} className="ml-auto not-italic" />
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden px-[8.2vw] pt-10">
        <div className="grid w-full grid-cols-[minmax(360px,650px)_minmax(520px,686px)] gap-[7.2vw]">
          <section className="pl-[2.6vw]">
            <h1 className="mb-4 text-[30px] font-normal leading-tight">Start</h1>
            <div className="flex flex-col gap-3">
              {startItems.map(({ id, label, icon: Icon }) => (
                <button key={label} className="flex items-center gap-4 text-left text-[20px] leading-none" style={{ color: '#22a6f2' }} onClick={() => runStartAction(id)}>
                  <Icon size={31} strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <h2 className="mb-4 mt-10 text-[30px] font-normal leading-tight">Recent</h2>
            <div className="flex flex-col gap-2 text-[20px]">
              {recentItems.map(([name, path]) => (
                <button key={`${name}-${path}`} className="grid grid-cols-[172px_1fr] text-left leading-tight" onClick={() => openRecent(name, path)}>
                  <span style={{ color: '#22a6f2' }}>{name}</span>
                  <span className="truncate" style={{ color: '#d8d8d8' }}>{path}</span>
                </button>
              ))}
              <button className="text-left text-[20px]" style={{ color: '#22a6f2' }} onClick={() => window.dispatchEvent(new CustomEvent('ai-web-ide:open-folder', { detail: { mode: 'open' } }))}>
                More...
              </button>
            </div>
          </section>

          <section>
            <h1 className="mb-4 text-[30px] font-normal leading-tight">Walkthroughs</h1>
            <div className="flex max-w-[686px] flex-col gap-6">
              {walkthroughs.map((item) => (
                <WalkthroughCard key={item.title} {...item} onClick={() => openWalkthrough(item.title, item.description)} />
              ))}
              <button className="-mt-2 text-left text-[20px]" style={{ color: '#22a6f2' }} onClick={() => openWalkthrough('More Walkthroughs')}>
                More...
              </button>
            </div>
          </section>
        </div>

        <button
          className="absolute bottom-[102px] left-1/2 flex h-[58px] -translate-x-1/2 items-center gap-4 rounded-full px-6 text-[20px] font-semibold"
          style={{ background: '#2b2b2b', color: '#d8d8d8' }}
          onClick={() => {
            setRightPanelVisible(true);
            notify('Agents window opened', 'success');
          }}
        >
          <Code2 size={30} style={{ color: '#22a6f2' }} />
          Try out the new Agents window
        </button>

        <label className="absolute bottom-[18px] left-1/2 flex -translate-x-1/2 items-center gap-3 text-[20px]" style={{ color: '#d8d8d8' }}>
          <input className="sr-only" type="checkbox" defaultChecked onChange={(event) => notify(`Welcome page on startup ${event.currentTarget.checked ? 'enabled' : 'disabled'}`, 'success')} />
          <span className="flex h-[28px] w-[28px] items-center justify-center rounded border" style={{ borderColor: '#5a5a5a', background: '#242424' }}>
            <Check size={20} style={{ color: '#8e8e8e' }} />
          </span>
          <span>Show welcome page on startup</span>
        </label>
      </div>
    </div>
  );
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

function WalkthroughCard({
  title,
  description,
  icon: Icon,
  badge,
  featured,
  progress = 0,
  onClick,
}: {
  title: string;
  description?: string;
  icon: typeof Star;
  badge?: string;
  featured?: boolean;
  progress?: number;
  onClick?: () => void;
}) {
  return (
    <button
      className="relative flex min-h-[48px] w-full items-center overflow-hidden rounded-md text-left"
      style={{ background: '#2b2b2b', color: '#d8d8d8' }}
      onClick={onClick}
    >
      {featured && (
        <div className="absolute left-0 top-0 h-0 w-0 border-r-[58px] border-t-[40px]" style={{ borderRightColor: 'transparent', borderTopColor: '#56afe0' }}>
          <Star size={18} fill="#ffffff" className="absolute -left-[52px] -top-[36px] text-white" />
        </div>
      )}
      <div className="flex w-full items-center gap-4 px-3 py-3">
        {!featured && (
          <span className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full" style={{ color: '#56afe0' }}>
            <Icon size={29} strokeWidth={1.7} />
          </span>
        )}
        <div className={featured ? 'ml-9' : ''}>
          <div className="flex items-center gap-2 text-[20px] font-semibold leading-tight">
            <span>{title}</span>
            {badge && (
              <span className="rounded-md px-1.5 py-0.5 text-[16px] font-normal" style={{ background: '#35a6dd', color: '#ffffff' }}>
                {badge}
              </span>
            )}
          </div>
          {description && <div className="mt-2 text-[20px] font-normal leading-tight">{description}</div>}
        </div>
      </div>
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 h-[5px]" style={{ width: `${progress * 100}%`, background: '#008ff0' }} />
      )}
    </button>
  );
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

function buildRecentWorkspaceTree(name: string, path: string): FileNode[] {
  return [{
    id: `recent-root-${Date.now()}`,
    name,
    path,
    type: 'directory',
    children: [{
      id: `recent-readme-${Date.now()}`,
      name: 'README.md',
      path: `${path}/README.md`,
      type: 'file',
      extension: 'md',
      language: 'markdown',
    }],
  }];
}

function buildGeneratedWorkspaceTree(projectName: string, basePath: string, appPath: string): FileNode[] {
  return [{
    id: `generated-root-${Date.now()}`,
    name: projectName,
    path: basePath,
    type: 'directory',
    children: [
      {
        id: `generated-package-${Date.now()}`,
        name: 'package.json',
        path: `${basePath}/package.json`,
        type: 'file',
        extension: 'json',
        language: 'json',
      },
      {
        id: `generated-src-${Date.now()}`,
        name: 'src',
        path: `${basePath}/src`,
        type: 'directory',
        children: [{
          id: `generated-app-${Date.now()}`,
          name: 'App.tsx',
          path: appPath,
          type: 'file',
          extension: 'tsx',
          language: 'typescript',
        }],
      },
    ],
  }];
}

function getDefaultContent(filename: string, language: string) {
  const defaults: Record<string, string> = {
    typescript: `// ${filename}\n\nexport {};\n`,
    javascript: `// ${filename}\n\n`,
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
    css: `/* ${filename} */\n\n`,
    json: '{\n  \n}\n',
    markdown: `# ${filename.replace('.md', '')}\n\n`,
    plaintext: '',
  };
  return defaults[language] || `// ${filename}\n`;
}
