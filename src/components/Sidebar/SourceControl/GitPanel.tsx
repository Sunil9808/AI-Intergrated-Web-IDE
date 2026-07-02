import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, GitBranch, Github, Minus, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../../../store/editorStore';
import { useSourceControlStore } from '../../../store/sourceControlStore';
import { useUIStore } from '../../../store/uiStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';

export default function GitPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const { tabs, saveTab } = useEditorStore();
  const addNotification = useUIStore((state) => state.addNotification);
  const {
    initialized,
    published,
    remoteUrl,
    branch,
    stagedFiles,
    commits,
    initializeRepository,
    publishRepository,
    stageFile,
    unstageFile,
    stageFiles,
    unstageAll,
    commit,
  } = useSourceControlStore();
  const [message, setMessage] = useState('');
  const [changesOpen, setChangesOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const dirtyTabs = useMemo(() => tabs.filter((tab) => tab.isDirty), [tabs]);
  const dirtyPaths = dirtyTabs.map((tab) => tab.filePath);
  const unstagedTabs = dirtyTabs.filter((tab) => !stagedFiles.includes(tab.filePath));
  const stagedTabs = tabs.filter((tab) => stagedFiles.includes(tab.filePath));

  const notify = (messageText: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addNotification({ type, message: messageText });
  };

  const openDocs = () => {
    const opened = window.open('https://code.visualstudio.com/docs/sourcecontrol/overview', '_blank', 'noopener,noreferrer');
    notify(opened ? 'Opened source control docs' : 'Allow pop-ups to open source control docs', opened ? 'success' : 'info');
  };

  const handleInitialize = () => {
    initializeRepository();
    notify('Initialized Git repository', 'success');
  };

  const handlePublish = () => {
    const defaultName = workspace?.name || 'untitled-workspace';
    const repoName = window.prompt('GitHub repository name', defaultName)?.trim();
    if (!repoName) return;

    const url = `https://github.com/local-preview/${repoName}`;
    publishRepository(url);
    notify(`Published ${repoName} to GitHub preview`, 'success');
  };

  const openFolder = () => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:open-folder', { detail: { mode: 'open' } }));
  };

  const cloneRepository = () => {
    const repositoryUrl = window.prompt('Repository URL to clone');
    if (!repositoryUrl?.trim()) return;

    const cleanUrl = repositoryUrl.trim();
    const repoName = cleanUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repository';
    publishRepository(`https://github.com/local-preview/${repoName}`);
    notify(`Cloned ${repoName}`, 'success');
    window.dispatchEvent(new CustomEvent('ai-web-ide:create-cloned-workspace', { detail: { repositoryUrl: cleanUrl, repoName } }));
  };

  const handleCommit = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      notify('Enter a commit message first', 'warning');
      return;
    }

    if (!stagedTabs.length) {
      notify('Stage at least one change before committing', 'warning');
      return;
    }

    stagedTabs.forEach((tab) => saveTab(tab.id));
    commit(trimmed, stagedTabs.map((tab) => tab.filePath));
    setMessage('');
    notify(`Committed ${stagedTabs.length} file${stagedTabs.length === 1 ? '' : 's'}`, 'success');
  };

  const refresh = () => {
    stageFiles(stagedFiles.filter((filePath) => dirtyPaths.includes(filePath)));
    notify('Source control refreshed', 'success');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
      <div className="flex h-10 items-center justify-between px-[30px] no-select">
        <span className="text-[16px] font-normal uppercase leading-none" style={{ color: 'var(--color-text)' }}>
          Source Control
        </span>
        {initialized && (
          <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
            <IconButton title="Refresh" onClick={refresh}><RefreshCw size={17} /></IconButton>
            <IconButton title="Commit Staged Changes" onClick={handleCommit}><Check size={17} /></IconButton>
            <IconButton title="Stage All Changes" onClick={() => stageFiles(unstagedTabs.map((tab) => tab.filePath))}><Plus size={17} /></IconButton>
            <IconButton title="More Actions" onClick={() => setHistoryOpen((value) => !value)}><MoreHorizontal size={18} /></IconButton>
          </div>
        )}
      </div>

      {!workspace ? (
        <NoFolderView
          onOpenFolder={openFolder}
          onCloneRepository={cloneRepository}
          onOpenDocs={openDocs}
        />
      ) : !initialized ? (
        <NoRepositoryView
          onInitialize={handleInitialize}
          onOpenDocs={openDocs}
          onPublish={handlePublish}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-2">
            <textarea
              className="h-[70px] w-full resize-none rounded px-2 py-2 text-[14px] outline-none"
              style={{ background: 'var(--color-input)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              placeholder={`Message (Ctrl+Enter to commit on '${branch}')`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                  handleCommit();
                }
              }}
            />
            <button
              className="h-[34px] w-full rounded-md text-[14px] font-medium transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: '#2f86ad', color: '#ffffff' }}
              onClick={handleCommit}
              disabled={!message.trim() || stagedTabs.length === 0}
            >
              Commit
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-textMuted)' }}>
            <GitBranch size={14} />
            <span>{branch}</span>
            {published && remoteUrl && <span className="ml-auto truncate text-[12px]">{remoteUrl}</span>}
          </div>

          <SourceSection
            title="Changes"
            count={unstagedTabs.length}
            open={changesOpen}
            onToggle={() => setChangesOpen((value) => !value)}
            actionTitle="Stage All Changes"
            onAction={() => stageFiles(unstagedTabs.map((tab) => tab.filePath))}
          >
            {unstagedTabs.length ? unstagedTabs.map((tab) => (
              <ChangeRow key={tab.id} name={tab.fileName} detail={tab.filePath} actionLabel="+" onAction={() => stageFile(tab.filePath)} />
            )) : <EmptyLine>No changes in working tree</EmptyLine>}
          </SourceSection>

          <SourceSection
            title="Staged Changes"
            count={stagedTabs.length}
            open={stagedOpen}
            onToggle={() => setStagedOpen((value) => !value)}
            actionTitle="Unstage All"
            onAction={unstageAll}
            actionIcon="minus"
          >
            {stagedTabs.length ? stagedTabs.map((tab) => (
              <ChangeRow key={tab.id} name={tab.fileName} detail={tab.filePath} actionLabel="-" onAction={() => unstageFile(tab.filePath)} />
            )) : <EmptyLine>No staged changes</EmptyLine>}
          </SourceSection>

          <SourceSection
            title="Commits"
            count={commits.length}
            open={historyOpen}
            onToggle={() => setHistoryOpen((value) => !value)}
          >
            {commits.length ? commits.map((entry) => (
              <div key={entry.id} className="rounded px-2 py-1 text-[12px] hover:bg-white/10" style={{ color: 'var(--color-text)' }}>
                <div className="truncate">{entry.message}</div>
                <div className="truncate" style={{ color: 'var(--color-textMuted)' }}>
                  {entry.files.length} file{entry.files.length === 1 ? '' : 's'} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )) : <EmptyLine>No commits yet</EmptyLine>}
          </SourceSection>

          {!published && (
            <button
              className="mt-4 flex h-[38px] w-full items-center justify-center gap-2 rounded-md text-[16px] transition-colors hover:brightness-110"
              style={{ background: '#2f86ad', color: '#ffffff' }}
              onClick={handlePublish}
            >
              <Github size={20} />
              Publish to GitHub
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NoFolderView({
  onOpenFolder,
  onCloneRepository,
  onOpenDocs,
}: {
  onOpenFolder: () => void;
  onCloneRepository: () => void;
  onOpenDocs: () => void;
}) {
  return (
    <div className="mx-px flex-1 overflow-y-auto border p-[24px]" style={{ borderColor: '#3794a6' }}>
      <div className="text-[20px] leading-[1.35]" style={{ color: '#dce2e8' }}>
        <p>
          In order to use Git features, you can open a folder containing a Git repository or clone from a URL.
        </p>

        <PanelButton onClick={onOpenFolder}>Open Folder</PanelButton>
        <PanelButton onClick={onCloneRepository}>Clone Repository</PanelButton>

        <p>
          To learn more about how to use Git and source control in VS Code{' '}
          <TextLink onClick={onOpenDocs}>read our docs</TextLink>.
        </p>
      </div>
    </div>
  );
}

function NoRepositoryView({
  onInitialize,
  onOpenDocs,
  onPublish,
}: {
  onInitialize: () => void;
  onOpenDocs: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="mx-px flex-1 overflow-y-auto border p-[30px]" style={{ borderColor: '#3794a6' }}>
      <div className="text-[20px] leading-[1.35]" style={{ color: '#dce2e8' }}>
        <p>
          The folder currently open doesn't have a Git repository. You can initialize a repository which will enable source control features powered by Git.
        </p>

        <PanelButton onClick={onInitialize}>Initialize Repository</PanelButton>

        <p>
          To learn more about how to use Git and source control in VS Code{' '}
          <TextLink onClick={onOpenDocs}>read our docs</TextLink>.
        </p>

        <p className="mt-6">
          You can directly publish this folder to a GitHub repository. Once published, you'll have access to source control features powered by Git and GitHub.
        </p>

        <PanelButton onClick={onPublish}>
          <Github size={24} fill="currentColor" />
          Publish to GitHub
        </PanelButton>
      </div>
    </div>
  );
}

function SourceSection({
  title,
  count,
  open,
  onToggle,
  actionTitle,
  onAction,
  actionIcon = 'plus',
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  actionTitle?: string;
  onAction?: () => void;
  actionIcon?: 'plus' | 'minus';
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex h-7 items-center gap-1 text-[12px] uppercase" style={{ color: 'var(--color-textMuted)' }}>
        <button className="flex h-6 w-5 items-center justify-center rounded hover:bg-white/10" onClick={onToggle}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span>{title}</span>
        <span className="ml-1 rounded px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--color-badge)', color: '#fff' }}>{count}</span>
        {onAction && (
          <button className="ml-auto flex h-6 w-6 items-center justify-center rounded hover:bg-white/10" title={actionTitle} onClick={onAction}>
            {actionIcon === 'minus' ? <Minus size={14} /> : <Plus size={14} />}
          </button>
        )}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

function ChangeRow({ name, detail, actionLabel, onAction }: { name: string; detail: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px]" style={{ color: 'var(--color-text)' }}>{name}</div>
        <div className="truncate text-[11px]" style={{ color: 'var(--color-textMuted)' }}>{detail}</div>
      </div>
      <button
        className="flex h-6 w-6 items-center justify-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
        style={{ color: 'var(--color-text)' }}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1 text-[12px]" style={{ color: 'var(--color-textMuted)' }}>{children}</div>;
}

function PanelButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="my-5 flex h-[38px] w-full items-center justify-center gap-2 rounded-md text-[18px] leading-none transition-colors hover:brightness-110"
      style={{ background: '#2f86ad', color: '#ffffff' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="inline text-left align-baseline" style={{ color: '#35b5ee' }} onClick={onClick}>
      {children}
    </button>
  );
}

function IconButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/10"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
