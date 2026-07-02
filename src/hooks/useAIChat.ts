import { useCallback } from 'react';
import { useAIStore } from '../store/aiStore';
import { useEditorStore } from '../store/editorStore';
import { ChatMessage } from '../types/ai.types';
import { v4 as uuidv4 } from '../utils/uuid';

export function useAIChat() {
  const {
    messages, isStreaming, isLoading, error,
    addMessage, appendToLastMessage, finalizeStreaming,
    clearMessages, setStreaming, setError, context,
  } = useAIStore();

  const { getActiveTab } = useEditorStore();

  const buildContext = useCallback(() => {
    const activeTab = getActiveTab();
    return {
      currentFile: activeTab ? {
        path: activeTab.filePath,
        content: activeTab.content,
        language: activeTab.language,
        name: activeTab.fileName,
      } : undefined,
      workspaceName: 'my-project',
      ...context,
    };
  }, [context, getActiveTab]);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;

    const ctx = buildContext();

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: ctx }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AI request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

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
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || parsed.text || '';
              if (text) appendToLastMessage(text);
            } catch {}
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      appendToLastMessage(`\n\n⚠️ Error: ${msg}`);
      setError(msg);
    } finally {
      finalizeStreaming();
    }
  }, [isStreaming, buildContext, addMessage, appendToLastMessage, finalizeStreaming, setStreaming, setError]);

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
