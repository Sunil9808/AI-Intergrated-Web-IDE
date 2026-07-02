import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Send,
  Bot,
  User,
  Trash2,
  Copy,
  Loader2,
  Code,
  Zap,
  Bug,
  RefreshCw,
  BookOpen,
  TestTube,
  FileText,
  X,
  Sparkles,
  ClipboardList,
  Play,
  Terminal,
  Globe2,
  CheckCircle2,
  Circle,
  Hammer,
  Files,
} from 'lucide-react';
import { useAIStore } from '../../../store/aiStore';
import { useEditorStore } from '../../../store/editorStore';
import { ChatMessage } from '../../../types/ai.types';
import { v4 as uuidv4 } from '../../../utils/uuid';

// Quick action commands
const AI_QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain', icon: BookOpen, color: '#60a5fa' },
  { id: 'generate', label: 'Generate', icon: Zap, color: '#34d399' },
  { id: 'debug', label: 'Debug', icon: Bug, color: '#f87171' },
  { id: 'refactor', label: 'Refactor', icon: RefreshCw, color: '#a78bfa' },
  { id: 'test', label: 'Tests', icon: TestTube, color: '#fbbf24' },
  { id: 'document', label: 'Docs', icon: FileText, color: '#fb923c' },
];

const AGENT_ACTIONS = [
  { id: 'build', label: 'Run build', icon: Hammer, command: 'npx vite build --outDir dist-check' },
  { id: 'test', label: 'Type check', icon: TestTube, command: 'npx tsc --noEmit' },
  { id: 'dev', label: 'Run app', icon: Terminal, command: 'npm run dev' },
  { id: 'browser', label: 'Check browser', icon: Globe2, command: null },
];

type AgentStepStatus = 'pending' | 'active' | 'done';

interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
}

interface AgentArtifact {
  id: string;
  title: string;
  detail: string;
  icon: typeof FileText;
}

interface AgentRunResult {
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

interface AIChatPanelProps {
  title?: string;
  onClose?: () => void;
}

export default function AIChatPanel({ title = 'AI Assistant', onClose }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [agentTask, setAgentTask] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentArtifacts, setAgentArtifacts] = useState<AgentArtifact[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, isStreaming, isLoading, error,
    addMessage, appendToLastMessage, finalizeStreaming,
    clearMessages, setStreaming, setError, context,
  } = useAIStore();

  const { getActiveTab } = useEditorStore();
  const activeTab = getActiveTab();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const focusDebugChat = () => {
      setSelectedAction('debug');
      setInput(activeTab ? `Help me debug ${activeTab.fileName}` : 'Help me debug my project');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    window.addEventListener('ai-web-ide:ai-debug-chat', focusDebugChat);
    return () => window.removeEventListener('ai-web-ide:ai-debug-chat', focusDebugChat);
  }, [activeTab]);

  const buildPromptWithAction = (userInput: string): string => {
    if (!selectedAction) return userInput;
    const code = activeTab?.content || '';
    const lang = activeTab?.language || 'code';
    const prompts: Record<string, string> = {
      explain: `Explain this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nAdditional context: ${userInput}`,
      generate: `Generate ${lang} code for: ${userInput}`,
      debug: `Debug this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nIssue: ${userInput}`,
      refactor: `Refactor this ${lang} code for: ${userInput}\n\`\`\`${lang}\n${code}\n\`\`\``,
      test: `Write unit tests for this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nFocus: ${userInput}`,
      document: `Add comprehensive documentation to this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\``,
    };
    return prompts[selectedAction] || userInput;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');
    setSelectedAction(null);

    // Build context
    const aiContext = {
      currentFile: activeTab ? {
        path: activeTab.filePath,
        content: activeTab.content,
        language: activeTab.language,
        name: activeTab.fileName,
      } : undefined,
      workspaceName: 'my-project',
    };

    // Add user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Add empty assistant message for streaming
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMsg);
    setStreaming(true);
    setError(null);

    try {
      const prompt = buildPromptWithAction(userText);
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: aiContext }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { break; }
            try {
              const parsed = JSON.parse(data);
              // OpenAI SSE format
              const text = parsed.choices?.[0]?.delta?.content
                || parsed.content  // Anthropic format
                || parsed.text     // Generic
                || '';
              if (text) appendToLastMessage(text);
            } catch {
              // partial chunk, ignore
            }
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach AI backend';
      appendToLastMessage(`\n\n⚠️ **Error:** ${errMsg}\n\nMake sure your server is running and API key is configured in \`.env\`.`);
    } finally {
      finalizeStreaming();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard?.writeText(content);
  };

  const createAgentPlan = (task: string): AgentStep[] => {
    const normalized = task.toLowerCase();
    const steps: AgentStep[] = [
      { id: 'understand', label: 'Understand the request and inspect current context', status: 'done' },
      { id: 'plan', label: 'Create an implementation plan', status: 'active' },
      { id: 'code', label: normalized.includes('bug') || normalized.includes('fix') ? 'Find and patch the likely issue' : 'Generate or update the required code', status: 'pending' },
      { id: 'verify', label: normalized.includes('test') ? 'Run tests and explain failures' : 'Run build or verification checks', status: 'pending' },
      { id: 'review', label: 'Summarize artifacts and next actions', status: 'pending' },
    ];
    return steps;
  };

  const addArtifact = (title: string, detail: string, icon: typeof FileText = FileText) => {
    setAgentArtifacts((items) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, detail, icon },
      ...items,
    ]);
  };

  const completeAgentPlan = () => {
    setAgentSteps((steps) => steps.map((step) => ({ ...step, status: 'done' })));
  };

  const runAgentCommand = async (command: string) => {
    window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { command } }));
    addArtifact('Terminal command started', command, Terminal);

    try {
      const response = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd: 'E:\\AI-Web-IDE' }),
      });
      const result = await response.json();
      addArtifact(
        result.exitCode === 0 ? 'Command passed' : 'Command failed',
        `${command}\n\n${result.output || '(no output)'}`.slice(0, 1200),
        result.exitCode === 0 ? CheckCircle2 : Bug
      );
    } catch (error) {
      addArtifact('Command runner unavailable', error instanceof Error ? error.message : 'Unable to run command', Bug);
    }
  };

  const openBrowserCheck = () => {
    window.open('http://127.0.0.1:3000', '_blank', 'noopener,noreferrer');
    addArtifact('Browser check', 'Opened the running app in an external browser for visual verification.', Globe2);
  };

  const startAgentTask = async () => {
    const task = agentTask.trim();
    if (!task || isStreaming) return;

    const plan = createAgentPlan(task);
    setAgentSteps(plan);
    setAgentArtifacts([]);
    setAgentTask('');
    addArtifact('Task plan', `${plan.map((step, index) => `${index + 1}. ${step.label}`).join('\n')}`, ClipboardList);

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: task,
      timestamp: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(userMsg);
    addMessage(assistantMsg);
    setStreaming(true);
    setError(null);

    try {
      appendToLastMessage('I am inspecting the request, planning edits, and preparing workspace actions...\n\n');

      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          context: {
            currentFile: activeTab ? {
              path: activeTab.filePath,
              content: activeTab.content,
              language: activeTab.language,
              name: activeTab.fileName,
            } : undefined,
            workspaceName: 'my-project',
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json() as AgentRunResult;
      const succeeded = result.actions.filter((action) => action.success).length;
      const failed = result.actions.length - succeeded;
      const actionLines = result.actions.length
        ? result.actions.map((action) => `${action.success ? 'OK' : 'FAILED'} ${action.type}: ${action.target}\n${action.output}`.trim()).join('\n\n')
        : 'No workspace actions were needed.';

      appendToLastMessage([
        `**Summary**\n${result.summary}`,
        result.plan.length ? `**Plan**\n${result.plan.map((step, index) => `${index + 1}. ${step}`).join('\n')}` : '',
        `**Workspace actions**\n${actionLines}`,
        result.nextSteps.length ? `**Next steps**\n${result.nextSteps.map((step) => `- ${step}`).join('\n')}` : '',
      ].filter(Boolean).join('\n\n'));

      completeAgentPlan();
      addArtifact('Agent result', `${succeeded} action(s) completed${failed ? `, ${failed} failed` : ''}.`, failed ? Bug : CheckCircle2);
      result.actions.slice(0, 5).forEach((action) => {
        addArtifact(
          `${action.success ? 'Done' : 'Failed'}: ${action.type}`,
          `${action.target}\n\n${action.output}`.slice(0, 1200),
          action.success ? CheckCircle2 : Bug
        );
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reach AI backend';
      appendToLastMessage(`\n\n**Error:** ${errMsg}\n\nMake sure your server is running and API key is configured in .env.`);
      setAgentSteps((steps) => steps.map((step) => step.status === 'active' ? { ...step, status: 'pending' } : step));
      addArtifact('Agent blocked', errMsg, Bug);
    } finally {
      finalizeStreaming();
    }
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'linear-gradient(180deg, #151b20 0%, var(--color-sidebar) 190px)',
        borderLeft: '1px solid rgba(34,166,242,0.16)',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 no-select" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between px-4 pb-3 pt-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #22a6f2, #47d6b6)',
                color: '#071018',
                boxShadow: '0 10px 28px rgba(34,166,242,0.28)',
              }}
            >
              <Sparkles size={21} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{title}</span>
                {isStreaming && <Loader2 size={12} className="animate-spin" style={{ color: '#47d6b6' }} />}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-textMuted)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: isStreaming ? '#fbbf24' : '#47d6b6' }} />
                <span>{isStreaming ? 'Working on your request' : 'Ready to help with this workspace'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              title="Clear chat"
              onClick={clearMessages}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--color-textMuted)' }}
            >
              <Trash2 size={14} />
            </button>
            {onClose && (
              <button
                title="Hide AI Pair Programmer"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10"
                style={{ color: 'var(--color-textMuted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {activeTab && (
          <div className="mx-4 mb-3 flex min-w-0 items-center gap-2 rounded-md px-3 py-2" style={{ background: 'rgba(34,166,242,0.1)', border: '1px solid rgba(34,166,242,0.24)' }}>
            <Code size={13} style={{ color: '#47d6b6' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-textMuted)' }}>Context</span>
            <span className="min-w-0 truncate text-[12px] font-medium" style={{ color: '#eaf7ff' }}>{activeTab.fileName}</span>
          </div>
        )}
      </div>

      {/* Agent Workspace */}
      <div className="flex-shrink-0 space-y-3 p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="rounded-lg p-3" style={{ background: 'rgba(34,166,242,0.075)', border: '1px solid rgba(34,166,242,0.22)' }}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} style={{ color: '#7dd3fc' }} />
              <span className="text-[12px] font-semibold" style={{ color: '#eaf7ff' }}>Autonomous task</span>
            </div>
            <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(71,214,182,0.14)', color: '#8df0d9' }}>
              agent mode
            </span>
          </div>
          <textarea
            value={agentTask}
            onChange={(event) => setAgentTask(event.target.value)}
            placeholder="Describe a larger task, e.g. Build login validation, run tests, and verify in browser..."
            className="mb-2 h-16 w-full resize-none rounded-md px-3 py-2 text-xs"
            style={{ background: '#10161b', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.1)' }}
            disabled={isStreaming}
          />
          <button
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-[12px] font-semibold transition-all hover:brightness-110"
            style={{
              background: isStreaming ? '#385260' : 'linear-gradient(135deg, #22a6f2, #47d6b6)',
              color: '#071018',
              opacity: !agentTask.trim() || isStreaming ? 0.55 : 1,
            }}
            disabled={!agentTask.trim() || isStreaming}
            onClick={startAgentTask}
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start agent task
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {AGENT_ACTIONS.map(({ id, label, icon: Icon, command }) => (
            <button
              key={id}
              className="flex h-9 items-center justify-center gap-2 rounded-md text-[11px] transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text)' }}
              onClick={() => command ? runAgentCommand(command) : openBrowserCheck()}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {agentSteps.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
              <Files size={14} style={{ color: '#7dd3fc' }} />
              Execution plan
            </div>
            <div className="space-y-2">
              {agentSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-2 text-[11px]" style={{ color: step.status === 'pending' ? 'var(--color-textMuted)' : 'var(--color-text)' }}>
                  {step.status === 'done' ? (
                    <CheckCircle2 size={13} style={{ color: '#47d6b6', marginTop: 1 }} />
                  ) : step.status === 'active' ? (
                    <Loader2 size={13} className="animate-spin" style={{ color: '#fbbf24', marginTop: 1 }} />
                  ) : (
                    <Circle size={13} style={{ color: '#5f6b73', marginTop: 1 }} />
                  )}
                  <span className="leading-4">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {agentArtifacts.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-normal" style={{ color: 'var(--color-textMuted)' }}>Artifacts</div>
            <div className="space-y-2">
              {agentArtifacts.slice(0, 4).map(({ id, title, detail, icon: Icon }) => (
                <div key={id} className="rounded-md p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    <Icon size={13} style={{ color: '#7dd3fc' }} />
                    {title}
                  </div>
                  <div className="line-clamp-3 whitespace-pre-wrap text-[11px] leading-4" style={{ color: 'var(--color-textMuted)' }}>
                    {detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {AI_QUICK_ACTIONS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setSelectedAction(selectedAction === id ? null : id)}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition-all hover:-translate-y-0.5"
            style={{
              background: selectedAction === id ? color + '24' : 'rgba(255,255,255,0.045)',
              color: selectedAction === id ? color : 'var(--color-text)',
              border: `1px solid ${selectedAction === id ? color + '80' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #22a6f2, #47d6b6)', color: '#071018', boxShadow: '0 20px 50px rgba(34,166,242,0.28)' }}>
              <Bot size={30} />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>Pair programmer ready</p>
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-textMuted)' }}>
                Ask for a review, fix, explanation, tests, or a new implementation using your active file as context.
              </p>
            </div>
            <div className="w-full space-y-2">
              {[
                'Explain this file',
                'Review the active editor for bugs',
                'Generate tests for this code',
                'Refactor this into cleaner TypeScript',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="w-full rounded-md px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.045)', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onCopy={copyMessage} />
        ))}

        {error && (
          <div className="rounded p-3 text-xs" style={{ background: '#2d1515', border: '1px solid #5c1a1a', color: '#f87171' }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
        {selectedAction && (
          <div className="flex items-center gap-1.5 mb-2 text-xxs" style={{ color: 'var(--color-textMuted)' }}>
            <span className="px-1.5 py-0.5 rounded" style={{ background: '#22a6f220', color: '#7dd3fc' }}>
              {AI_QUICK_ACTIONS.find(a => a.id === selectedAction)?.label} mode
            </span>
            <span>active - type your request</span>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedAction
                ? `Describe what you want to ${selectedAction}...`
                : 'Ask AI anything... (Shift+Enter for new line)'
            }
            className="flex-1 resize-none rounded-lg px-3 py-2 text-xs"
            style={{
              background: '#202529',
              color: 'var(--color-text)',
              border: '1px solid rgba(255,255,255,0.1)',
              minHeight: 60,
              maxHeight: 120,
              outline: 'none',
            }}
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="self-end flex flex-shrink-0 items-center justify-center rounded-lg text-white transition-all hover:brightness-110"
            style={{
              background: isStreaming ? '#385260' : 'linear-gradient(135deg, #22a6f2, #47d6b6)',
              opacity: !input.trim() || isStreaming ? 0.5 : 1,
              color: '#071018',
              width: 36, height: 36,
            }}
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onCopy }: { message: ChatMessage; onCopy: (c: string) => void }) {
  const isUser = message.role === 'user';
  const [showCopy, setShowCopy] = useState(false);

  // Render markdown-like content
  const renderContent = (content: string) => {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
        const lang = match?.[1] || '';
        const code = match?.[2] || part.slice(3, -3);
        return (
          <div key={i} className="my-2 rounded overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#1a1a1a', borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-xxs" style={{ color: 'var(--color-textMuted)' }}>{lang || 'code'}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(code)}
                className="text-xxs flex items-center gap-1 hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                <Copy size={10} /> Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-xs" style={{ color: '#e2e2e2', fontFamily: 'JetBrains Mono, monospace' }}>
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      // Render inline formatting
      return (
        <span key={i} className="whitespace-pre-wrap text-xs" style={{ color: isUser ? '#fff' : 'var(--color-text)' }}>
          {part}
        </span>
      );
    });
  };

  return (
    <div
      className="group"
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
    >
      <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 self-start mt-0.5"
          style={{
            background: isUser ? 'var(--color-accent)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          }}
        >
          {isUser ? <User size={12} className="text-white" /> : <Bot size={12} className="text-white" />}
        </div>

        {/* Content */}
        <div
          className="flex-1 rounded-lg px-3 py-2 max-w-full"
          style={{
            background: isUser ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
          }}
        >
          {message.isStreaming && message.content === '' ? (
            <div className="flex items-center gap-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#7c3aed', animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-xxs ml-1" style={{ color: 'var(--color-textMuted)' }}>AI is thinking...</span>
            </div>
          ) : (
            <div>{renderContent(message.content)}</div>
          )}
          {message.isStreaming && message.content !== '' && (
            <span className="inline-block w-0.5 h-3.5 animate-pulse ml-0.5" style={{ background: '#7c3aed', verticalAlign: 'text-bottom' }} />
          )}
        </div>

        {/* Copy button */}
        {showCopy && message.content && !isUser && (
          <button
            onClick={() => onCopy(message.content)}
            className="self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
            style={{ color: 'var(--color-textMuted)' }}
          >
            <Copy size={11} />
          </button>
        )}
      </div>

      {/* Timestamp */}
      <div className={`text-xxs mt-1 ${isUser ? 'text-right pr-8' : 'pl-8'}`} style={{ color: 'var(--color-textMuted)' }}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
