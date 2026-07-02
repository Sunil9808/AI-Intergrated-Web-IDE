export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  tokens?: number;
  model?: string;
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface AIContext {
  currentFile?: {
    path: string;
    content: string;
    language: string;
    name: string;
  };
  selectedCode?: {
    text: string;
    startLine: number;
    endLine: number;
    language: string;
  };
  openFiles?: Array<{
    path: string;
    name: string;
    language: string;
  }>;
  workspaceName?: string;
  recentErrors?: string[];
  terminalOutput?: string;
}

export interface AIRequest {
  type: AIRequestType;
  prompt: string;
  context: AIContext;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export type AIRequestType = 
  | 'chat'
  | 'explain'
  | 'generate'
  | 'debug'
  | 'refactor'
  | 'document'
  | 'convert'
  | 'review'
  | 'test'
  | 'performance';

export interface AIResponse {
  id: string;
  type: AIRequestType;
  content: string;
  tokens: number;
  model: string;
  timestamp: number;
  duration: number;
}

export interface AICommand {
  id: string;
  label: string;
  description: string;
  type: AIRequestType;
  icon: string;
  shortcut?: string;
  prompt?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  maxTokens: number;
  supportsStreaming: boolean;
  description: string;
}

export interface AISettings {
  provider: 'openai' | 'gemini';
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  streamResponses: boolean;
  includeFileContext: boolean;
  includeWorkspaceContext: boolean;
}
