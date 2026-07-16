import { useState } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, FolderPlus, RefreshCw, ChevronsDownUp } from 'lucide-react';
import { useFileStore } from '../../../store/fileStore';
import { useEditorStore } from '../../../store/editorStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useUIStore } from '../../../store/uiStore';
import { FileNode } from '../../../types/file.types';
import { getLanguageFromExtension } from '../../../utils/fileHelpers';
import { fileService } from '../../../services/fileService';
import { browserFileCache } from '../../../services/browserFileCache';
import FileTypeIcon from '../../Icons/FileTypeIcon';

export default function Explorer() {
  const { fileTree, expandedFolders, toggleFolder, collapseFolder, selectedFileId, selectFile, addFile } = useFileStore();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const { openTab } = useEditorStore();
  const { addNotification } = useUIStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  const createFile = () => {
    if (!workspace) return;
    const fileName = window.prompt('File name', 'new-file.txt')?.trim();
    if (!fileName) return;

    const language = getLanguageFromExtension(fileName);
    const node: FileNode = {
      id: `file-${Date.now()}`,
      name: fileName,
      path: `${workspace.path}/${fileName}`,
      type: 'file',
      extension: fileName.split('.').pop(),
      language,
      lastModified: Date.now(),
    };

    addFile(node);
    openTab({
      id: `tab-${node.id}`,
      fileId: node.id,
      filePath: node.path,
      fileName,
      language,
      content: getDefaultContent(fileName, language),
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    addNotification({ type: 'success', message: `Created ${fileName}` });
  };

  const createFolder = () => {
    if (!workspace) return;
    const folderName = window.prompt('Folder name', 'new-folder')?.trim();
    if (!folderName) return;

    addFile({
      id: `folder-${Date.now()}`,
      name: folderName,
      path: `${workspace.path}/${folderName}`,
      type: 'directory',
      children: [],
      lastModified: Date.now(),
    });
    addNotification({ type: 'success', message: `Created ${folderName}` });
  };

  const refreshExplorer = () => {
    addNotification({ type: 'success', message: 'Explorer refreshed' });
  };

  const collapseAll = () => {
    expandedFolders.forEach((folderId) => collapseFolder(folderId));
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.id);
      return;
    }

    selectFile(node.id);
    const language = getLanguageFromExtension(node.name);
    const content = await readNodeContent(node, language);
    openTab({
      id: `tab-${node.id}`,
      fileId: node.id,
      filePath: node.path,
      fileName: node.name,
      language,
      content,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" onClick={() => setContextMenu(null)}>
      <div className="flex h-9 items-center justify-between px-3 no-select">
        <span className="text-[11px] font-medium uppercase tracking-normal" style={{ color: 'var(--color-text)' }}>
          Explorer
        </span>
        {workspace ? (
          <div className="flex items-center gap-1">
            <IconBtn icon={<Plus size={14} />} title="New File" onClick={createFile} />
            <IconBtn icon={<FolderPlus size={14} />} title="New Folder" onClick={createFolder} />
            <IconBtn icon={<RefreshCw size={13} />} title="Refresh" onClick={refreshExplorer} />
            <IconBtn icon={<ChevronsDownUp size={13} />} title="Collapse All" onClick={collapseAll} />
          </div>
        ) : (
          <IconBtn icon={<MoreHorizontal size={16} />} title="More Actions" />
        )}
      </div>

      {workspace ? (
        <div className="flex-1 overflow-y-auto py-1">
          <div className="px-2 py-1">
            <div className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-normal no-select" style={{ color: 'var(--color-textMuted)' }}>
              <ChevronDown size={12} />
              <span>{workspace.name}</span>
            </div>
          </div>

          {fileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              selectedFileId={selectedFileId}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : (
        <NoFolderOpened />
      )}

      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg py-1 text-xs shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#150f2a',
            border: '1px solid rgba(167,139,250,0.2)',
            minWidth: 180,
            boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
          }}
        >
          {[
            { label: 'New File', action: () => {} },
            { label: 'New Folder', action: () => {} },
            null,
            { label: 'Rename', action: () => {} },
            { label: 'Delete', action: () => {} },
            null,
            { label: 'Copy Path', action: () => navigator.clipboard?.writeText(contextMenu.node.path) },
            { label: 'Copy Relative Path', action: () => {} },
            null,
            { label: 'Open in Terminal', action: () => {} },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="my-1" style={{ borderTop: '1px solid var(--color-border)' }} />
            ) : (
              <button
                key={i}
                className="w-full px-4 py-1 text-left transition-colors hover:bg-white/10"
                style={{ color: 'var(--color-text)' }}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function NoFolderOpened() {
  const { setFileTree } = useFileStore();
  const { setWorkspace } = useWorkspaceStore();
  const { openTab } = useEditorStore();
  const { addNotification } = useUIStore();

  const openFolder = (mode: 'open' | 'add' = 'open') => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:open-folder', { detail: { mode } }));
  };

  const openDocs = () => {
    const opened = window.open('https://code.visualstudio.com/docs/sourcecontrol/overview', '_blank', 'noopener,noreferrer');
    addNotification({
      type: opened ? 'success' : 'info',
      message: opened ? 'Opened source control docs' : 'Allow pop-ups to open the source control docs',
    });
  };

  const createWorkspace = (name: string, path: string, tree: FileNode[]) => {
    setWorkspace({
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
    });
    setFileTree(tree);
  };

  const cloneRepository = () => {
    const repositoryUrl = window.prompt('Repository URL to clone');
    if (!repositoryUrl?.trim()) return;

    const cleanUrl = repositoryUrl.trim();
    const repoName = cleanUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repository';
    const readmeContent = `# ${repoName}\n\nCloned from ${cleanUrl}.\n\nThis browser IDE created a local workspace preview for the repository.\n`;
    const tree: FileNode[] = [
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

    createWorkspace(repoName, `/cloned/${repoName}`, tree);
    openTab({
      id: `tab-clone-readme-${Date.now()}`,
      fileId: tree[0].children?.[0].id || `repo-readme-${Date.now()}`,
      filePath: `/cloned/${repoName}/README.md`,
      fileName: 'README.md',
      language: 'markdown',
      content: readmeContent,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    addNotification({ type: 'success', message: `Cloned ${repoName}` });
  };

  const createJavaProject = () => {
    const projectName = window.prompt('Java project name', 'java-project')?.trim() || 'java-project';
    const basePath = `/java/${projectName}`;
    const mainPath = `${basePath}/src/main/java/App.java`;
    const tree: FileNode[] = [
      {
        id: `java-root-${Date.now()}`,
        name: projectName,
        path: basePath,
        type: 'directory',
        children: [
          {
            id: `java-src-${Date.now()}`,
            name: 'src',
            path: `${basePath}/src`,
            type: 'directory',
            children: [
              {
                id: `java-main-${Date.now()}`,
                name: 'main',
                path: `${basePath}/src/main`,
                type: 'directory',
                children: [
                  {
                    id: `java-folder-${Date.now()}`,
                    name: 'java',
                    path: `${basePath}/src/main/java`,
                    type: 'directory',
                    children: [
                      {
                        id: `java-app-${Date.now()}`,
                        name: 'App.java',
                        path: mainPath,
                        type: 'file',
                        extension: 'java',
                        language: 'java',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: `java-readme-${Date.now()}`,
            name: 'README.md',
            path: `${basePath}/README.md`,
            type: 'file',
            extension: 'md',
            language: 'markdown',
          },
        ],
      },
    ];

    createWorkspace(projectName, basePath, tree);
    openTab({
      id: `tab-java-app-${Date.now()}`,
      fileId: `java-app-${Date.now()}`,
      filePath: mainPath,
      fileName: 'App.java',
      language: 'java',
      content: `public class App {\n    public static void main(String[] args) {\n        System.out.println("Hello from ${projectName}!");\n    }\n}\n`,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    addNotification({ type: 'success', message: `Created ${projectName}` });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-8 items-center gap-1 border-b px-2 text-[11px] font-semibold uppercase" style={{ borderColor: '#3794a6', color: '#d7d7d7' }}>
        <ChevronDown size={19} strokeWidth={1.8} style={{ color: '#b9c6cf' }} />
        <span>No Folder Opened</span>
      </div>

      <div className="px-5 pt-4 text-[13px] leading-[1.45]" style={{ color: '#dce2e8' }}>
        <p>You have not yet opened a folder.</p>

        <ExplorerActionButton onClick={() => openFolder('open')}>Open Folder</ExplorerActionButton>

        <p>
          Opening a folder will close all currently open editors. To keep them open,{' '}
          <TextLink onClick={() => openFolder('add')}>add a folder</TextLink> instead.
        </p>

        <p className="mt-6">You can clone a repository locally.</p>

        <ExplorerActionButton onClick={cloneRepository}>
          Clone Repository
        </ExplorerActionButton>

        <p>
          To learn more about how to use Git and source control in VS Code{' '}
          <TextLink onClick={openDocs}>
            read our docs
          </TextLink>.
        </p>

        <p className="mt-6">
          You can also <TextLink onClick={() => openFolder('open')}>open a Java project folder</TextLink>, or create a new Java project by clicking the button below.
        </p>

        <ExplorerActionButton onClick={createJavaProject}>
          Create Java Project
        </ExplorerActionButton>
      </div>
    </div>
  );
}

function ExplorerActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="my-4 h-[30px] w-full rounded-lg text-[13px] font-medium leading-none transition-all hover:brightness-110 hover:shadow-lg"
      style={{ background: 'rgba(167,139,250,0.2)', color: 'var(--color-accent)', border: '1px solid rgba(167,139,250,0.3)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="inline text-left align-baseline" style={{ color: 'var(--color-accent)' }} onClick={onClick}>
      {children}
    </button>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedFileId: string | null;
  onFileClick: (node: FileNode) => void | Promise<void>;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

function FileTreeNode({ node, depth, expandedFolders, selectedFileId, onFileClick, onContextMenu }: FileTreeNodeProps) {
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFileId === node.id;
  return (
    <>
      <div
        className="flex h-[22px] cursor-pointer items-center gap-1 rounded-sm px-1 no-select"
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          background: isSelected ? 'var(--color-selected)' : 'transparent',
          color: 'var(--color-text)',
        }}
        onClick={() => void onFileClick(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === 'directory' ? (
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center" style={{ color: 'var(--color-textMuted)' }}>
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <FileTypeIcon filename={node.name} isDirectory={node.type === 'directory'} isOpen={isExpanded} size={16} />
        <span
          className={`ml-0.5 truncate text-[13px] leading-none ${isSelected ? 'font-semibold' : 'font-normal'}`}
          style={{ color: isSelected ? '#fff' : 'var(--color-text)' }}
        >
          {node.name}
        </span>
      </div>

      {node.type === 'directory' && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          selectedFileId={selectedFileId}
          onFileClick={onFileClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}

function IconBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
      style={{ color: 'var(--color-textMuted)' }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      {icon}
    </button>
  );
}

function getDefaultContent(filename: string, language: string): string {
  const defaults: Record<string, string> = {
    typescript: `// ${filename}\n\nexport {};\n`,
    javascript: `// ${filename}\n\n`,
    java: `public class ${filename.replace('.java', '')} {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n`,
    python: `# ${filename}\n\n`,
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
    css: `/* ${filename} */\n\n`,
    json: `{\n  \n}\n`,
    markdown: `# ${filename.replace('.md', '')}\n\n`,
    plaintext: ``,
  };
  return defaults[language] || `// ${filename}\n`;
}

async function readNodeContent(node: FileNode, language: string) {
  const browserContent = await browserFileCache.read(node.path);
  if (browserContent !== null) return browserContent;

  try {
    const result = await fileService.readFile(node.path);
    return result.content;
  } catch {
    return getDefaultContent(node.name, language);
  }
}
