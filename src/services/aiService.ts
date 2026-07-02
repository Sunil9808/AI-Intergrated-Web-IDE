import { AIRequest, AIContext } from '../types/ai.types';
import { useAIStore } from '../store/aiStore';

const BASE_URL = '/api/ai';

export const aiService = {
  async sendMessage(
    prompt: string,
    context: AIContext,
    onChunk?: (chunk: string) => void,
    onComplete?: (fullText: string) => void
  ): Promise<void> {
    const store = useAIStore.getState();
    store.setStreaming(true);
    store.setError(null);

    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AI request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || parsed.text || '';
              if (text) {
                fullText += text;
                store.appendToLastMessage(text);
                onChunk?.(text);
              }
            } catch {
              // Partial JSON, continue
            }
          }
        }
      }

      store.finalizeStreaming();
      onComplete?.(fullText);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      store.setError(msg);
      store.finalizeStreaming();
    }
  },

  async explainCode(code: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Explain this ${language} code in detail. Describe what it does, how it works, the key concepts used, and any potential improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    return this.sendMessage(prompt, context);
  },

  async generateCode(description: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Generate ${language} code for the following requirement:\n\n${description}\n\nProvide clean, well-commented, production-ready code with explanations.`;
    return this.sendMessage(prompt, context);
  },

  async debugCode(code: string, error: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Debug this ${language} code that has the following error:\n\nError:\n${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nFind the bug, explain why it occurs, and provide the fixed code.`;
    return this.sendMessage(prompt, context);
  },

  async refactorCode(code: string, language: string, instruction: string, context: AIContext): Promise<void> {
    const prompt = `Refactor this ${language} code: ${instruction}\n\nOriginal code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide refactored code with explanations of changes made.`;
    return this.sendMessage(prompt, context);
  },

  async reviewCode(code: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Review this ${language} code for:\n1. Code quality and best practices\n2. Performance issues\n3. Security vulnerabilities\n4. Bug risks\n5. Maintainability\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide specific, actionable feedback.`;
    return this.sendMessage(prompt, context);
  },

  async generateTests(code: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude edge cases, happy paths, and error scenarios.`;
    return this.sendMessage(prompt, context);
  },

  async generateDocs(code: string, language: string, context: AIContext): Promise<void> {
    const prompt = `Generate comprehensive documentation for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude JSDoc/docstrings, parameter descriptions, return values, examples, and usage notes.`;
    return this.sendMessage(prompt, context);
  },

  async convertCode(code: string, fromLang: string, toLang: string, context: AIContext): Promise<void> {
    const prompt = `Convert this ${fromLang} code to ${toLang}:\n\n\`\`\`${fromLang}\n${code}\n\`\`\`\n\nMaintain the same functionality and provide idiomatic ${toLang} code with explanations.`;
    return this.sendMessage(prompt, context);
  },

  buildContextString(context: AIContext): string {
    let ctx = '';
    if (context.workspaceName) ctx += `Workspace: ${context.workspaceName}\n`;
    if (context.currentFile) {
      ctx += `Current file: ${context.currentFile.path} (${context.currentFile.language})\n`;
    }
    if (context.openFiles && context.openFiles.length > 0) {
      ctx += `Open files: ${context.openFiles.map((f) => f.path).join(', ')}\n`;
    }
    return ctx;
  },
};

export const buildAIRequest = (
  type: AIRequest['type'],
  prompt: string,
  context: AIContext
): AIRequest => ({
  type,
  prompt,
  context,
  stream: true,
});
