import { MoreHorizontal } from 'lucide-react';
import { useEditorStore } from '../../../store/editorStore';
import { useUIStore } from '../../../store/uiStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';

export default function DebugPanel() {
  const activeTab = useEditorStore((state) => state.getActiveTab());
  const openTab = useEditorStore((state) => state.openTab);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const { addNotification, setActiveBottomPanel, setBottomPanelVisible, setActiveSidebarPanel } = useUIStore();

  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addNotification({ type, message });
  };

  const openFile = () => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:open-file'));
  };

  const openFolder = () => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:open-folder', { detail: { mode: 'open' } }));
  };

  const createLaunchJson = () => {
    if (!workspace) {
      openFolder();
      notify('Open a folder before creating launch.json', 'info');
      return;
    }

    openTab({
      id: `tab-launch-${Date.now()}`,
      fileId: `launch-${Date.now()}`,
      filePath: `${workspace.path}/.vscode/launch.json`,
      fileName: 'launch.json',
      language: 'json',
      content: `{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run Active File",
      "program": "\${file}",
      "console": "integratedTerminal"
    }
  ]
}
`,
      isDirty: true,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
    notify('Created launch.json', 'success');
  };

  const runAndDebug = () => {
    if (!activeTab) {
      openFile();
      notify('Open a debuggable file first', 'info');
      return;
    }

    const command = getRunCommand(activeTab.fileName);
    setActiveBottomPanel('terminal');
    setBottomPanelVisible(true);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { command } }));
    }, 0);
    notify(`Running ${activeTab.fileName}`, 'success');
  };

  const openTerminalCommand = () => {
    setActiveBottomPanel('terminal');
    setBottomPanelVisible(true);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { action: 'new' } }));
    }, 0);
    notify('Terminal opened for debug commands', 'success');
  };

  const openInteractiveChat = () => {
    setActiveSidebarPanel('ai');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-web-ide:ai-debug-chat'));
    }, 0);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
      <div className="flex h-11 items-center justify-between px-7 no-select">
        <span className="text-[16px] font-normal uppercase leading-none" style={{ color: 'var(--color-text)' }}>
          Run and Debug: Run
        </span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-textMuted)' }}
          title="More Actions"
          onClick={createLaunchJson}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="mx-px flex-1 overflow-y-auto border px-7 pt-5" style={{ borderColor: '#3794a6' }}>
        <div className="text-[20px] leading-[1.35]" style={{ color: '#dce2e8' }}>
          <p>
            <TextLink onClick={openFile}>Open a file</TextLink> which can be debugged or run.
          </p>

          <PanelButton onClick={runAndDebug}>Run and Debug</PanelButton>

          <p>
            To customize Run and Debug, <TextLink onClick={openFolder}>open a folder</TextLink> and create a launch.json file.
          </p>

          {workspace && (
            <button className="mt-2 text-left text-[18px]" style={{ color: '#35b5ee' }} onClick={createLaunchJson}>
              Create launch.json
            </button>
          )}

          <p className="mt-6">
            Debug using a <TextLink onClick={openTerminalCommand}>terminal command</TextLink> or in an{' '}
            <TextLink onClick={openInteractiveChat}>interactive chat</TextLink>.
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="my-5 flex h-[38px] w-full items-center justify-center rounded-md text-[18px] leading-none transition-colors hover:brightness-110"
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

function getRunCommand(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const commands: Record<string, string> = {
    js: `node "${fileName}"`,
    cjs: `node "${fileName}"`,
    mjs: `node "${fileName}"`,
    ts: `npx ts-node "${fileName}"`,
    py: `python "${fileName}"`,
    java: `javac "${fileName}" && java "${fileName.replace(/\.java$/i, '')}"`,
    html: `echo "Open ${fileName} in the browser preview"`,
    json: `echo "No runtime configured for ${fileName}"`,
  };

  return commands[ext || ''] || `echo "No runner configured for ${fileName}"`;
}
