import { useRef, useEffect, useCallback, useState } from 'react';
import MonacoEditorReact, { OnMount, OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';
import { useAIStore } from '../../store/aiStore';
import { fileService } from '../../services/fileService';
import { aiService } from '../../services/aiService';
import { v4 as uuidv4 } from '../../utils/uuid';
import { ChatMessage } from '../../types/ai.types';
import { ExtensionItem, supportsFormatting, supportsLanguage, useExtensionStore } from '../../store/extensionStore';
import { getExtensionCompletionItems } from '../../services/extensionCompletionService';
import { fetchInlineCompletion } from '../../services/inlineCompletionService';
import { configureMonacoEditor } from '../../setup/monacoSetup';
import { setMonacoInstance } from '../../services/extensionRuntime';

let smartCompletionProvidersRegistered = false;
let editorThemesRegistered = false;
let inlineCompletionProviderRegistered = false;
const EMPTY_EDITOR_BACKGROUND_IMAGE = 'https://img.freepik.com/premium-photo/elegant-dark-background-designs_1199394-20502.jpg';

interface MonacoEditorProps {
  tabId: string;
  filePath: string;
  content: string;
  language: string;
  onContentChange?: (content: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
}

interface EditorContextMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  separator?: boolean;
  children?: EditorContextMenuItem[];
  action?: () => void | Promise<void>;
}

export default function MonacoEditor({ tabId, filePath, content, language, onContentChange }: MonacoEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const multiCursorModifierRef = useRef<'alt' | 'ctrlCmd'>('alt');
  const columnSelectionRef = useRef(false);
  const breakpointLinesRef = useRef<Set<number>>(new Set());
  const breakpointDecorationsRef = useRef<string[]>([]);
  const breakpointsEnabledRef = useRef(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const { updateTabContent, updateCursorPosition, saveTab, settings } = useEditorStore();
  const installedExtensions = useExtensionStore((state) => state.installed);
  const { theme } = useSettingsStore();
  const { addNotification, setActiveSidebarPanel, setSidebarVisible, setRightPanelVisible } = useUIStore();

  const monacoTheme = theme === 'light'
    ? 'ai-web-ide-light-plus'
    : theme === 'high-contrast'
      ? 'hc-black'
      : 'ai-web-ide-cursor-dark';
  const showEmptyEditorBackground = filePath.startsWith('/untitled/') && content.trim().length === 0;

  const handleBeforeMount = useCallback(async (monaco: typeof Monaco) => {
    registerEditorThemes(monaco);
    await configureMonacoEditor(monaco);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerEditorThemes(monaco);
    registerSmartCompletionProviders(monaco);
    registerInlineCompletionProvider(monaco);

    // Wire Monaco into the extension runtime so linting, formatting,
    // and theme services can use the real Monaco API
    setMonacoInstance(monaco);

    // Set editor content
    editor.setValue(content);

    // Track cursor position
    editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      updateCursorPosition(tabId, {
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editor.onDidChangeModelContent((event: Monaco.editor.IModelContentChangedEvent) => {
      const typedText = event.changes[0]?.text || '';
      if (/^[A-Za-z_]$/.test(typedText) || ['.', '<', '/', ':'].includes(typedText)) {
        window.setTimeout(() => {
          const model = editor.getModel();
          const position = editor.getPosition();
          if (!model || !position) return;

          const word = model.getWordUntilPosition(position);
          if (word.word.length >= 1 || ['.', '<', '/', ':'].includes(typedText)) {
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
          }
        }, 0);
      }

      if (useAIStore.getState().settings.inlineCompletionsEnabled) {
        const delay = useAIStore.getState().settings.inlineCompletionsDelay;
        window.setTimeout(() => {
          editor.trigger('ai-inline', 'editor.action.inlineSuggest.trigger', {});
        }, delay + 50);
      }
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave(editor, filePath, tabId);
    });

    editor.onContextMenu((event: Monaco.editor.IEditorMouseEvent) => {
      event.event.preventDefault();
      event.event.stopPropagation();
      setOpenSubmenu(null);
      setContextMenu({
        x: event.event.browserEvent.clientX,
        y: event.event.browserEvent.clientY,
      });
    });

    // Add AI explain shortcut
    editor.addAction({
      id: 'ai-explain',
      label: 'AI: Explain Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE],
      run: () => {
        window.dispatchEvent(new CustomEvent('ai-web-ide:editor-command', { detail: 'ai-explain' }));
      },
    });

    editor.addAction({
      id: 'ai-generate',
      label: 'AI: Generate Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => {
        window.dispatchEvent(new CustomEvent('ai-web-ide:editor-command', { detail: 'ai-generate' }));
      },
    });

    // Format document on Shift+Alt+F
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      async () => {
        if (supportsFormatting(useExtensionStore.getState().installed)) {
          const formatted = formatWithInstalledExtension(editor.getValue(), language);
          editor.setValue(formatted);
          updateTabContent(tabId, formatted);
          addNotification({ type: 'success', message: 'Formatted with installed formatter extension' });
          return;
        }
        await editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Focus editor
    editor.focus();
  }, [tabId, content, language, updateTabContent, addNotification]);

  useEffect(() => {
    if (!editorRef.current) return;
    const active = supportsFormatting(installedExtensions) || supportsLanguageNotice(installedExtensions, language);
    if (active) {
      addNotification({ type: 'info', message: `Extension support active for ${language}` });
    }
  }, [installedExtensions, language, addNotification]);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => {
      setContextMenu(null);
      setOpenSubmenu(null);
    };

    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addNotification({ type, message });
  };

  const runMonacoAction = async (actionId: string, fallbackCommand?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const action = editor.getAction(actionId);
    if (action) {
      await action.run();
      return;
    }

    editor.trigger('context-menu', fallbackCommand || actionId, null);
  };

  const renderBreakpoints = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const decorations = Array.from(breakpointLinesRef.current)
      .filter((line) => line >= 1 && line <= model.getLineCount())
      .map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: breakpointsEnabledRef.current
            ? 'ai-web-ide-breakpoint-glyph'
            : 'ai-web-ide-breakpoint-glyph-disabled',
          glyphMarginHoverMessage: { value: breakpointsEnabledRef.current ? 'Breakpoint' : 'Disabled breakpoint' },
        },
      }));

    breakpointDecorationsRef.current = editor.deltaDecorations(breakpointDecorationsRef.current, decorations);
  }, []);

  const toggleBreakpoint = (lineNumber?: number) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const line = Math.max(1, Math.min(model.getLineCount(), lineNumber || editor.getPosition()?.lineNumber || 1));
    if (breakpointLinesRef.current.has(line)) {
      breakpointLinesRef.current.delete(line);
      notify(`Breakpoint removed at line ${line}`, 'success');
    } else {
      breakpointLinesRef.current.add(line);
      notify(`Breakpoint added at line ${line}`, 'success');
    }
    renderBreakpoints();
    editor.focus();
  };

  const getSelectedOrFileText = () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return content;
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) return model.getValueInRange(selection);
    return model.getValue();
  };

  const sendCodeToChat = async (mode: 'file' | 'inline' | 'explain' | 'review') => {
    const editor = editorRef.current;
    const selectedOrFileText = getSelectedOrFileText();
    const selectedLabel = editor?.getSelection()?.isEmpty() ? 'file' : 'selection';
    const prompts: Record<typeof mode, string> = {
      file: `Use this file as context for the next request:\n\n\`\`\`${language}\n${content}\n\`\`\``,
      inline: `Help me with this ${language} ${selectedLabel}:\n\n\`\`\`${language}\n${selectedOrFileText}\n\`\`\``,
      explain: `Explain this ${language} ${selectedLabel}:\n\n\`\`\`${language}\n${selectedOrFileText}\n\`\`\``,
      review: `Review this ${language} ${selectedLabel} for bugs, quality, performance, security, and maintainability:\n\n\`\`\`${language}\n${selectedOrFileText}\n\`\`\``,
    };

    setRightPanelVisible(true);

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: prompts[mode],
      timestamp: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const aiStore = useAIStore.getState();
    aiStore.addMessage(userMsg);
    aiStore.addMessage(assistantMsg);

    const selection = editor?.getSelection();

    await aiService.sendMessage(prompts[mode], {
      currentFile: {
        path: filePath,
        content,
        language,
        name: filePath.split('/').pop() || filePath,
      },
      selectedCode: selection && !selection.isEmpty()
        ? {
            text: selectedOrFileText,
            startLine: selection.startLineNumber,
            endLine: selection.endLineNumber,
            language,
          }
        : undefined,
      workspaceName: 'my-project',
    });
  };

  const copySelection = async () => {
    const text = getSelectedOrFileText();
    await navigator.clipboard?.writeText(text);
    notify('Copied to clipboard', 'success');
  };

  const cutSelection = async () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) return;

    await navigator.clipboard?.writeText(model.getValueInRange(selection));
    editor.pushUndoStop();
    editor.executeEdits('context-menu-cut', [{ range: selection, text: '' }]);
    editor.pushUndoStop();
  };

  const pasteText = async () => {
    const editor = editorRef.current;
    const selections = editor?.getSelections() || [];
    if (!editor || !selections.length) return;

    const text = await navigator.clipboard?.readText();
    if (!text) {
      editor.trigger('context-menu', 'editor.action.clipboardPasteAction', null);
      return;
    }

    editor.pushUndoStop();
    editor.executeEdits('context-menu-paste', selections.map((selection) => ({ range: selection, text })));
    editor.pushUndoStop();
  };

  const contextMenuItems: EditorContextMenuItem[] = [
    { id: 'definition', label: 'Go to Definition', shortcut: 'F12', action: () => runMonacoAction('editor.action.revealDefinition') },
    { id: 'type-definition', label: 'Go to Type Definition', action: () => runMonacoAction('editor.action.goToTypeDefinition') },
    { id: 'source-definition', label: 'Go to Source Definition', action: () => runMonacoAction('editor.action.goToDeclaration') },
    { id: 'implementations', label: 'Go to Implementations', shortcut: 'Ctrl+F12', action: () => runMonacoAction('editor.action.goToImplementation') },
    { id: 'references', label: 'Go to References', shortcut: 'Shift+F12', action: () => runMonacoAction('editor.action.goToReferences') },
    { id: 'peek', label: 'Peek', children: [
      { id: 'peek-definition', label: 'Peek Definition', action: () => runMonacoAction('editor.action.peekDefinition') },
      { id: 'peek-type-definition', label: 'Peek Type Definition', action: () => runMonacoAction('editor.action.peekTypeDefinition') },
      { id: 'peek-implementations', label: 'Peek Implementations', action: () => runMonacoAction('editor.action.peekImplementation') },
      { id: 'peek-references', label: 'Peek References', action: () => runMonacoAction('editor.action.referenceSearch.trigger') },
    ] },
    { id: 'sep-reference', separator: true },
    { id: 'find-references', label: 'Find All References', shortcut: 'Shift+Alt+F12', action: () => runMonacoAction('editor.action.referenceSearch.trigger') },
    { id: 'find-implementations', label: 'Find All Implementations', action: () => runMonacoAction('editor.action.peekImplementation') },
    { id: 'call-hierarchy', label: 'Show Call Hierarchy', shortcut: 'Shift+Alt+H', action: () => runMonacoAction('editor.showCallHierarchy') },
    { id: 'sep-chat', separator: true },
    { id: 'add-file-chat', label: 'Add File to Chat', action: () => sendCodeToChat('file') },
    { id: 'inline-chat', label: 'Open Inline Chat', shortcut: 'Ctrl+I', action: () => sendCodeToChat('inline') },
    { id: 'explain', label: 'Explain', action: () => sendCodeToChat('explain') },
    { id: 'review', label: 'Review', action: () => sendCodeToChat('review') },
    { id: 'sep-edit-code', separator: true },
    { id: 'rename', label: 'Rename Symbol', shortcut: 'F2', action: () => runMonacoAction('editor.action.rename') },
    { id: 'change-all', label: 'Change All Occurrences', shortcut: 'Ctrl+F2', action: () => runMonacoAction('editor.action.changeAll') },
    { id: 'format', label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => runMonacoAction('editor.action.formatDocument') },
    { id: 'format-with', label: 'Format Document With...', action: () => runMonacoAction('editor.action.formatDocument.multiple') },
    { id: 'refactor', label: 'Refactor...', shortcut: 'Ctrl+Shift+R', action: () => runMonacoAction('editor.action.refactor') },
    { id: 'source-action', label: 'Source Action...', action: () => runMonacoAction('editor.action.sourceAction') },
    { id: 'sep-changes', separator: true },
    { id: 'open-changes', label: 'Open Changes', children: [
      { id: 'open-current-file', label: 'Copy File Path', action: async () => {
        await navigator.clipboard?.writeText(filePath);
        notify('File path copied', 'success');
      } },
      { id: 'open-workspace-changes', label: 'Show Source Control', action: () => {
        setActiveSidebarPanel('git');
        setSidebarVisible(true);
      } },
    ] },
    { id: 'sep-clipboard', separator: true },
    { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', action: cutSelection },
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: copySelection },
    { id: 'copy-as', label: 'Copy As', children: [
      { id: 'copy-as-text', label: 'Plain Text', action: copySelection },
      { id: 'copy-as-json', label: 'JSON String', action: async () => {
        await navigator.clipboard?.writeText(JSON.stringify(getSelectedOrFileText()));
        notify('Copied as JSON string', 'success');
      } },
      { id: 'copy-file-path', label: 'File Path', action: async () => {
        await navigator.clipboard?.writeText(filePath);
        notify('File path copied', 'success');
      } },
    ] },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', action: pasteText },
  ];

  const runMenuItem = async (item: EditorContextMenuItem) => {
    if (item.children || item.separator) return;
    setContextMenu(null);
    setOpenSubmenu(null);
    try {
      await item.action?.();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Command failed', 'error');
    }
  };

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) {
      updateTabContent(tabId, value);
      onContentChange?.(value);
    }
  }, [tabId]);

  // Auto-save
  useEffect(() => {
    if (!settings.autoSave) return;
    const timer = setTimeout(async () => {
      const tab = useEditorStore.getState().tabs.find(t => t.id === tabId);
      if (tab?.isDirty) {
        await handleSave(editorRef.current!, filePath, tabId);
      }
    }, settings.autoSaveDelay);
    return () => clearTimeout(timer);
  }, [content, settings.autoSave, settings.autoSaveDelay]);

  useEffect(() => {
    const runCommand = async (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel();
      if (!editor || !monaco || !model) return;

      editor.focus();

      if (command === 'copy' || command === 'cut') {
        const selection = editor.getSelection();
        if (!selection || selection.isEmpty()) return;

        const selectedText = model.getValueInRange(selection);
        try {
          await navigator.clipboard.writeText(selectedText);
        } catch {
          document.execCommand('copy');
        }

        if (command === 'cut') {
          editor.pushUndoStop();
          editor.executeEdits('titlebar-cut', [{ range: selection, text: '' }]);
          editor.pushUndoStop();
        }
        return;
      }

      if (command === 'paste') {
        try {
          const text = await navigator.clipboard.readText();
          const selections = editor.getSelections() || [];
          if (text && selections.length) {
            editor.pushUndoStop();
            editor.executeEdits(
              'titlebar-paste',
              selections.map((selection) => ({ range: selection, text }))
            );
            editor.pushUndoStop();
          }
        } catch {
          editor.trigger('titlebar', 'editor.action.clipboardPasteAction', null);
        }
        return;
      }

      if (command === 'duplicate-selection') {
        const selections = editor.getSelections() || [];
        if (!selections.length) return;

        editor.pushUndoStop();
        editor.executeEdits(
          'titlebar-duplicate-selection',
          selections.map((selection) => {
            const text = selection.isEmpty()
              ? `${model.getLineContent(selection.startLineNumber)}\n`
              : model.getValueInRange(selection);
            return {
              range: selection.isEmpty()
                ? new monaco.Range(selection.startLineNumber, 1, selection.startLineNumber, 1)
                : selection,
              text: selection.isEmpty() ? text : `${text}${text}`,
            };
          })
        );
        editor.pushUndoStop();
        return;
      }

      if (command === 'cursors-line-ends') {
        const selections = editor.getSelections() || [];
        const lineNumbers = new Set<number>();
        selections.forEach((selection) => {
          const start = Math.min(selection.startLineNumber, selection.endLineNumber);
          const end = Math.max(selection.startLineNumber, selection.endLineNumber);
          for (let line = start; line <= end; line += 1) lineNumbers.add(line);
        });

        const nextSelections = Array.from(lineNumbers).map((line) => {
          const column = model.getLineMaxColumn(line);
          return new monaco.Selection(line, column, line, column);
        });
        editor.setSelections(nextSelections);
        editor.focus();
        return;
      }

      if (command === 'multi-cursor-modifier') {
        multiCursorModifierRef.current = multiCursorModifierRef.current === 'alt' ? 'ctrlCmd' : 'alt';
        editor.updateOptions({ multiCursorModifier: multiCursorModifierRef.current });
        return;
      }

      if (command === 'column-selection-mode') {
        columnSelectionRef.current = !columnSelectionRef.current;
        editor.updateOptions({ columnSelection: columnSelectionRef.current });
        return;
      }

      if (command === 'run-selected-text') {
        const selection = editor.getSelection();
        const selectedText = selection && !selection.isEmpty()
          ? model.getValueInRange(selection)
          : model.getLineContent(editor.getPosition()?.lineNumber || 1);

        if (!selectedText.trim()) {
          notify('Select code or place the cursor on a command to run it', 'warning');
          return;
        }

        window.dispatchEvent(new CustomEvent('ai-web-ide:terminal-command', { detail: { command: selectedText.trim() } }));
        return;
      }

      if (command === 'ai-explain') {
        void sendCodeToChat('explain');
        return;
      }

      if (command === 'ai-generate') {
        const instruction = window.prompt('What code should AI generate?');
        if (!instruction?.trim()) return;
        const selection = editor.getSelection();
        const selectedText = selection && !selection.isEmpty() ? model.getValueInRange(selection) : model.getValue();
        setRightPanelVisible(true);

        const prompt = `Generate ${language} code for this request:\n\n${instruction.trim()}\n\nCurrent ${selection && !selection.isEmpty() ? 'selection' : 'file'} context:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        const userMsg: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        };
        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        const aiStore = useAIStore.getState();
        aiStore.addMessage(userMsg);
        aiStore.addMessage(assistantMsg);
        await aiService.sendMessage(prompt, {
          currentFile: {
            path: filePath,
            content: model.getValue(),
            language,
            name: filePath.split('/').pop() || filePath,
          },
          selectedCode: selection && !selection.isEmpty()
            ? {
                text: selectedText,
                startLine: selection.startLineNumber,
                endLine: selection.endLineNumber,
                language,
              }
            : undefined,
          workspaceName: 'my-project',
        });
        return;
      }

      if (command === 'toggle-breakpoint') {
        toggleBreakpoint();
        return;
      }

      if (command === 'new-line-breakpoint') {
        const value = window.prompt('Line number', String(editor.getPosition()?.lineNumber || 1));
        const line = Number(value);
        if (Number.isInteger(line)) toggleBreakpoint(line);
        return;
      }

      if (command === 'enable-breakpoints') {
        breakpointsEnabledRef.current = true;
        renderBreakpoints();
        notify('All breakpoints enabled', 'success');
        return;
      }

      if (command === 'disable-breakpoints') {
        breakpointsEnabledRef.current = false;
        renderBreakpoints();
        notify('All breakpoints disabled', 'success');
        return;
      }

      if (command === 'remove-breakpoints') {
        breakpointLinesRef.current.clear();
        renderBreakpoints();
        notify('All breakpoints removed', 'success');
        return;
      }

      const commandMap: Record<string, string> = {
        undo: 'undo',
        redo: 'redo',
        find: 'actions.find',
        replace: 'editor.action.startFindReplaceAction',
        'line-comment': 'editor.action.commentLine',
        'block-comment': 'editor.action.blockComment',
        'emmet-expand': 'editor.emmet.action.expandAbbreviation',
        'select-all': 'editor.action.selectAll',
        'expand-selection': 'editor.action.smartSelect.expand',
        'shrink-selection': 'editor.action.smartSelect.shrink',
        'copy-line-up': 'editor.action.copyLinesUpAction',
        'copy-line-down': 'editor.action.copyLinesDownAction',
        'move-line-up': 'editor.action.moveLinesUpAction',
        'move-line-down': 'editor.action.moveLinesDownAction',
        'cursor-above': 'editor.action.insertCursorAbove',
        'cursor-below': 'editor.action.insertCursorBelow',
        'add-next-occurrence': 'editor.action.addSelectionToNextFindMatch',
        'add-previous-occurrence': 'editor.action.addSelectionToPreviousFindMatch',
        'select-all-occurrences': 'editor.action.selectHighlights',
        'last-edit-location': 'editor.action.goToLastEditLocation',
        'go-to-symbol': 'editor.action.quickOutline',
        'go-to-definition': 'editor.action.revealDefinition',
        'peek-definition': 'editor.action.peekDefinition',
        'go-to-declaration': 'editor.action.goToDeclaration',
        'go-to-type-definition': 'editor.action.goToTypeDefinition',
        'go-to-implementation': 'editor.action.goToImplementation',
        'go-to-references': 'editor.action.goToReferences',
        'go-to-line': 'editor.action.gotoLine',
        'go-to-bracket': 'editor.action.jumpToBracket',
        'rename-symbol': 'editor.action.rename',
        'quick-fix': 'editor.action.quickFix',
        'refactor': 'editor.action.refactor',
        'source-action': 'editor.action.sourceAction',
        'format-document': 'editor.action.formatDocument',
        'fold-all': 'editor.foldAll',
        'unfold-all': 'editor.unfoldAll',
        'next-problem': 'editor.action.marker.next',
        'previous-problem': 'editor.action.marker.prev',
      };

      const monacoCommand = commandMap[command];
      if (!monacoCommand) return;

      const action = editor.getAction(monacoCommand);
      if (action) {
        await action.run();
      } else {
        editor.trigger('titlebar', monacoCommand, null);
      }
    };

    window.addEventListener('ai-web-ide:editor-command', runCommand);
    return () => window.removeEventListener('ai-web-ide:editor-command', runCommand);
  }, []);

  // Update content when tab changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== content) {
      const model = editorRef.current.getModel();
      if (model) {
        editorRef.current.pushUndoStop();
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: content }],
          () => null
        );
        editorRef.current.pushUndoStop();
      }
    }
  }, [content]);

  return (
    <div
      className={`relative h-full w-full ${showEmptyEditorBackground ? 'empty-monaco-background' : ''}`}
      style={showEmptyEditorBackground ? {
        backgroundImage: `url("${EMPTY_EDITOR_BACKGROUND_IMAGE}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      } : undefined}
    >
      <MonacoEditorReact
        height="100%"
        language={language}
        theme={monacoTheme}
        value={content}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        options={{
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        fontWeight: '400',
        lineHeight: Math.max(20, settings.fontSize + 6),
        suggestFontSize: 13,
        suggestLineHeight: 22,
        fontLigatures: true,
        tabSize: settings.tabSize,
        insertSpaces: settings.insertSpaces,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        renderWhitespace: settings.renderWhitespace,
        cursorStyle: 'line',
        cursorBlinking: 'blink',
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        formatOnPaste: settings.formatOnPaste,
        formatOnType: true,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoClosingOvertype: 'always',
        autoSurround: 'languageDefined',
        autoIndent: 'full',
        matchBrackets: 'always',
        tabCompletion: 'on',
        colorDecorators: true,
        linkedEditing: true,
        renderValidationDecorations: 'on',
        showUnused: true,
        inlayHints: { enabled: settings.inlayHints ? 'onUnlessPressed' : 'off' },
        unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true },
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        foldingStrategy: 'auto',
        stickyScroll: { enabled: settings.stickyScroll },
        bracketPairColorization: { enabled: settings.bracketPairColorization },
        'semanticHighlighting.enabled': true,
        guides: {
          bracketPairs: settings.bracketPairColorization,
          indentation: true,
        },
        suggest: {
          insertMode: 'replace',
          filterGraceful: true,
          localityBonus: true,
          matchOnWordStartOnly: false,
          preview: true,
          selectionMode: 'always',
          showIcons: true,
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showSnippets: true,
          showUsers: true,
          showIssues: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        quickSuggestionsDelay: 80,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        wordBasedSuggestions: 'allDocuments',
        inlineSuggest: {
          enabled: useAIStore.getState().settings.inlineCompletionsEnabled,
          mode: 'prefix',
          showToolbar: 'onHover',
        },
        snippetSuggestions: 'top',
        parameterHints: { enabled: settings.parameterHints, cycle: true },
        hover: { enabled: true, delay: 300, sticky: true },
        contextmenu: false,
        dragAndDrop: true,
        links: true,
        multiCursorMergeOverlapping: true,
        multiCursorPaste: 'spread',
        mouseWheelZoom: true,
        renderLineHighlight: 'all',
        selectionHighlight: true,
        occurrencesHighlight: 'multiFile',
        codeLens: settings.codeLens,
        lightbulb: { enabled: 'on' as 'on' },
        padding: { top: 8, bottom: 8 },
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        glyphMargin: true,
        lineDecorationsWidth: 5,
        lineNumbersMinChars: 4,
      }}
        loading={
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#1e1e1e' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs" style={{ color: '#858585' }}>Loading editor...</span>
            </div>
          </div>
        }
      />

      {contextMenu && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          openSubmenu={openSubmenu}
          setOpenSubmenu={setOpenSubmenu}
          onRun={runMenuItem}
        />
      )}
    </div>
  );
}

function EditorContextMenu({
  x,
  y,
  items,
  openSubmenu,
  setOpenSubmenu,
  onRun,
}: {
  x: number;
  y: number;
  items: EditorContextMenuItem[];
  openSubmenu: string | null;
  setOpenSubmenu: (id: string | null) => void;
  onRun: (item: EditorContextMenuItem) => void;
}) {
  const width = 320;
  const estimatedHeight = items.reduce((height, item) => height + (item.separator ? 9 : 28), 10);
  const maxHeight = Math.min(window.innerHeight - 8, estimatedHeight);
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - maxHeight - 8);

  return (
    <div
      className="fixed z-[100] overflow-visible rounded-md py-1.5 text-[13px] shadow-2xl"
      style={{
        left,
        top: Math.max(4, top),
        width,
        maxHeight,
        background: '#1f2020',
        border: '1px solid #303234',
        color: '#cfcfcf',
        boxShadow: '0 8px 28px rgba(0,0,0,.55)',
      }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
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
              className="grid h-7 w-full grid-cols-[18px_minmax(0,1fr)_auto_16px] items-center px-3 text-left leading-none transition-colors hover:bg-[#04395e]"
              style={{ color: '#cfcfcf' }}
              onClick={() => onRun(item)}
            >
              <span />
              <span className="truncate">{item.label}</span>
              <span className="pl-4 text-right text-[12px]" style={{ color: '#9a9a9a' }}>
                {item.shortcut}
              </span>
              <span className="flex justify-end" style={{ color: '#9a9a9a' }}>
                {item.children ? '›' : ''}
              </span>
            </button>

            {item.children && openSubmenu === item.id && (
              <div
                className="absolute left-[calc(100%-4px)] top-0 z-[101] w-[250px] rounded-md py-1.5 text-[13px] shadow-2xl"
                style={{ background: '#1f2020', border: '1px solid #303234', color: '#cfcfcf' }}
              >
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    className="grid h-7 w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center px-3 text-left hover:bg-[#04395e]"
                    onClick={() => onRun(child)}
                  >
                    <span />
                    <span className="truncate">{child.label}</span>
                    {child.shortcut && <span className="pl-3 text-[#9a9a9a]">{child.shortcut}</span>}
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

function registerEditorThemes(monaco: typeof Monaco) {
  if (editorThemesRegistered) return;
  editorThemesRegistered = true;

  monaco.editor.defineTheme('ai-web-ide-cursor-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'EEFFFF', fontStyle: '' },
      { token: 'comment', foreground: '676E95', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '676E95', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'keyword.control', foreground: 'C792EA' },
      { token: 'keyword.operator', foreground: '89DDFF' },
      { token: 'operator', foreground: '89DDFF' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'string.escape', foreground: 'C3E88D' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'regexp', foreground: 'F78C6C' },
      { token: 'type', foreground: 'FFCB6B' },
      { token: 'type.identifier', foreground: 'FFCB6B' },
      { token: 'class', foreground: 'FFCB6B' },
      { token: 'interface', foreground: 'FFCB6B' },
      { token: 'identifier', foreground: 'EEFFFF' },
      { token: 'variable', foreground: 'EEFFFF' },
      { token: 'variable.predefined', foreground: '82AAFF' },
      { token: 'variable.parameter', foreground: 'EEFFFF' },
      { token: 'function', foreground: '82AAFF' },
      { token: 'method', foreground: '82AAFF' },
      { token: 'delimiter', foreground: '89DDFF' },
      { token: 'tag', foreground: 'F07178' },
      { token: 'attribute.name', foreground: 'C792EA' },
      { token: 'attribute.value', foreground: 'C3E88D' },
      { token: 'metatag', foreground: 'FF5370' },
      { token: 'constant', foreground: 'F78C6C' },
      { token: 'namespace', foreground: 'FFCB6B' },
    ],
    colors: {
      'editor.background': '#181818',
      'editor.foreground': '#eeffff',
      'editorLineNumber.foreground': '#4b4b4b',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editor.selectionBackground': '#3e4451',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editor.lineHighlightBackground': '#1f1f1f',
      'editor.lineHighlightBorder': '#1f1f1f',
      'editorIndentGuide.background1': '#2f2f2f',
      'editorIndentGuide.activeBackground1': '#5a5a5a',
      'editorSuggestWidget.background': '#1e1e1e',
      'editorSuggestWidget.border': '#2d2d2d',
      'editorSuggestWidget.foreground': '#d4d4d4',
      'editorSuggestWidget.highlightForeground': '#82aaff',
      'editorSuggestWidget.selectedBackground': '#2c313a',
      'editorGhostText.foreground': '#6a737d',
      'editorGhostText.background': '#181818',
      'editorBracketMatch.background': '#3e4451',
      'editorBracketMatch.border': '#89ddff',
    },
  });

  monaco.editor.defineTheme('ai-web-ide-dark-plus', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'D4D4D4' },
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'keyword.operator', foreground: 'D4D4D4' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'variable.predefined', foreground: '4FC1FF' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'method', foreground: 'DCDCAA' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'tag', foreground: '569CD6' },
      { token: 'attribute.name', foreground: '9CDCFE' },
      { token: 'attribute.value', foreground: 'CE9178' },
      { token: 'metatag', foreground: '569CD6' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.foreground': '#d4d4d4',
      'editorSuggestWidget.highlightForeground': '#2aaaff',
      'editorSuggestWidget.selectedBackground': '#04395e',
    },
  });

  monaco.editor.defineTheme('ai-web-ide-light-plus', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '000000' },
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'keyword.operator', foreground: '000000' },
      { token: 'operator', foreground: '000000' },
      { token: 'string', foreground: 'A31515' },
      { token: 'string.escape', foreground: 'EE0000' },
      { token: 'number', foreground: '098658' },
      { token: 'regexp', foreground: '811F3F' },
      { token: 'type', foreground: '267F99' },
      { token: 'type.identifier', foreground: '267F99' },
      { token: 'identifier', foreground: '001080' },
      { token: 'variable', foreground: '001080' },
      { token: 'variable.predefined', foreground: '0000FF' },
      { token: 'function', foreground: '795E26' },
      { token: 'method', foreground: '795E26' },
      { token: 'delimiter', foreground: '000000' },
      { token: 'tag', foreground: '800000' },
      { token: 'attribute.name', foreground: 'E50000' },
      { token: 'attribute.value', foreground: 'A31515' },
      { token: 'metatag', foreground: '800000' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editorLineNumber.foreground': '#237893',
      'editorLineNumber.activeForeground': '#0b216f',
      'editorCursor.foreground': '#000000',
      'editor.selectionBackground': '#add6ff',
      'editor.inactiveSelectionBackground': '#e5ebf1',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editorIndentGuide.background1': '#d3d3d3',
      'editorIndentGuide.activeBackground1': '#939393',
      'editorSuggestWidget.background': '#f3f3f3',
      'editorSuggestWidget.border': '#c8c8c8',
      'editorSuggestWidget.foreground': '#000000',
      'editorSuggestWidget.highlightForeground': '#0066bf',
      'editorSuggestWidget.selectedBackground': '#d6ebff',
    },
  });
}

function registerInlineCompletionProvider(monaco: typeof Monaco) {
  if (inlineCompletionProviderRegistered) return;
  inlineCompletionProviderRegistered = true;

  const languages = [
    'javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx',
    'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    'html', 'css', 'scss', 'json', 'yaml', 'markdown', 'shell', 'sql', 'plaintext',
  ];

  languages.forEach((languageId) => {
    monaco.languages.registerInlineCompletionsProvider(languageId, {
      provideInlineCompletions: async (model, position, _context, token) => {
        const aiSettings = useAIStore.getState().settings;
        if (!aiSettings.inlineCompletionsEnabled) {
          return { items: [] };
        }

        const prefix = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const suffix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineContent(model.getLineCount()).length + 1,
        });

        if (prefix.trim().length < 2) {
          return { items: [] };
        }

        const activeTab = useEditorStore.getState().getActiveTab();
        const completion = await fetchInlineCompletion(
          prefix,
          suffix,
          model.getLanguageId(),
          {
            currentFile: activeTab ? {
              path: activeTab.filePath,
              content: model.getValue(),
              language: model.getLanguageId(),
              name: activeTab.fileName,
            } : undefined,
            workspaceName: 'my-project',
          },
          aiSettings.inlineCompletionsDelay
        );

        if (!completion || token.isCancellationRequested) {
          return { items: [] };
        }

        return {
          items: [{
            insertText: completion,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
          }],
          enableForwardStability: true,
        };
      },
      freeInlineCompletions: () => {},
    });
  });
}

function registerSmartCompletionProviders(monaco: typeof Monaco) {
  if (smartCompletionProvidersRegistered) return;
  smartCompletionProvidersRegistered = true;

  const languages = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'jsx',
    'tsx',
    'python',
    'java',
    'cpp',
    'c',
    'csharp',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'html',
    'css',
    'scss',
    'json',
    'yaml',
    'markdown',
    'shell',
    'sql',
    'plaintext',
  ];

  languages.forEach((languageId) => {
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ['.', ':', '<', '/', '"', "'", '`', '@', '#', '$'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const prefix = word.word.toLowerCase();
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const languageSuggestions = getLanguageCompletionItems(monaco, model.getLanguageId(), range);
        const documentSuggestions = getDocumentWordCompletionItems(monaco, model, range);
        const extensionSuggestions = getExtensionCompletionItems(
          monaco,
          useExtensionStore.getState().installed,
          model.getLanguageId(),
          range
        );
        const suggestions = [...languageSuggestions, ...extensionSuggestions, ...documentSuggestions]
          .filter((suggestion) => {
            const label = String(suggestion.label).toLowerCase();
            return !prefix || label.includes(prefix);
          })
          .sort((a, b) => {
            const aLabel = String(a.label).toLowerCase();
            const bLabel = String(b.label).toLowerCase();
            const aStarts = prefix && aLabel.startsWith(prefix) ? 0 : 1;
            const bStarts = prefix && bLabel.startsWith(prefix) ? 0 : 1;
            return aStarts - bStarts || aLabel.localeCompare(bLabel);
          })
          .slice(0, 80);

        return { suggestions };
      },
    });
  });
}

function getLanguageCompletionItems(
  monaco: typeof Monaco,
  languageId: string,
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] {
  const kind = monaco.languages.CompletionItemKind;
  const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  const keyword = (label: string): Monaco.languages.CompletionItem => ({
    label,
    kind: kind.Keyword,
    insertText: label,
    range,
  });
  const snippet = (label: string, insertText: string, detail: string): Monaco.languages.CompletionItem => ({
    label,
    kind: kind.Snippet,
    insertText,
    insertTextRules: snippetRule,
    detail,
    range,
  });

  const common = ['TODO', 'FIXME', 'class', 'console', 'const', 'export', 'false', 'function', 'import', 'length', 'let', 'line', 'list', 'local', 'log', 'loop', 'return', 'true', 'value'].map(keyword);
  const reactItems = [
    ...['children', 'className', 'disabled', 'export', 'Fragment', 'import', 'key', 'onChange', 'onClick', 'props', 'React', 'return', 'style', 'useCallback', 'useEffect', 'useMemo', 'useRef', 'useState'].map(keyword),
    snippet('component', 'export default function ${1:Component}() {\n\treturn (\n\t\t${0:<div />}\n\t);\n}', 'React component'),
    snippet('useEffect', 'useEffect(() => {\n\t${0}\n}, [${1}]);', 'React effect'),
    snippet('useState', 'const [${1:value}, set${2:Value}] = useState(${3:null});', 'React state'),
    snippet('map', '{${1:items}.map((${2:item}) => (\n\t${0:<div key={${2:item}.id} />}\n))}', 'Render list'),
  ];
  const items: Record<string, Monaco.languages.CompletionItem[]> = {
    python: [
      ...['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'if', 'import', 'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield', 'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'input'].map(keyword),
      snippet('def', 'def ${1:function_name}(${2:args}):\n\t${0:pass}', 'Python function'),
      snippet('class', 'class ${1:ClassName}:\n\tdef __init__(self${2:, args}):\n\t\t${0:pass}', 'Python class'),
      snippet('ifmain', 'if __name__ == "__main__":\n\t${0:main()}', 'Python main guard'),
      snippet('for', 'for ${1:item} in ${2:items}:\n\t${0:pass}', 'Python for loop'),
    ],
    javascript: [
      ...['await', 'async', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'let', 'localStorage', 'location', 'log', 'new', 'null', 'return', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'while', 'console', 'document', 'window'].map(keyword),
      snippet('fn', 'function ${1:name}(${2:args}) {\n\t${0}\n}', 'JavaScript function'),
      snippet('afn', 'const ${1:name} = async (${2:args}) => {\n\t${0}\n};', 'Async arrow function'),
      snippet('log', 'console.log(${1:value});', 'Console log'),
    ],
    typescript: [
      ...['abstract', 'any', 'as', 'async', 'await', 'boolean', 'class', 'const', 'enum', 'export', 'extends', 'false', 'implements', 'import', 'interface', 'let', 'localStorage', 'namespace', 'null', 'number', 'private', 'protected', 'public', 'readonly', 'return', 'string', 'true', 'type', 'undefined', 'unknown', 'void'].map(keyword),
      snippet('interface', 'interface ${1:Name} {\n\t${0}\n}', 'TypeScript interface'),
      snippet('type', 'type ${1:Name} = ${0};', 'TypeScript type alias'),
      snippet('component', 'function ${1:Component}() {\n\treturn ${0:null};\n}', 'React component'),
    ],
    javascriptreact: reactItems,
    typescriptreact: reactItems,
    jsx: reactItems,
    tsx: reactItems,
    java: [
      ...['abstract', 'boolean', 'break', 'case', 'catch', 'class', 'continue', 'double', 'else', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import', 'int', 'interface', 'new', 'private', 'protected', 'public', 'return', 'static', 'String', 'this', 'throw', 'try', 'void', 'while'].map(keyword),
      snippet('main', 'public static void main(String[] args) {\n\t${0}\n}', 'Java main method'),
      snippet('class', 'public class ${1:ClassName} {\n\t${0}\n}', 'Java class'),
    ],
    cpp: [
      ...['auto', 'bool', 'break', 'case', 'catch', 'class', 'const', 'continue', 'double', 'else', 'for', 'if', 'include', 'int', 'namespace', 'private', 'protected', 'public', 'return', 'std', 'string', 'struct', 'template', 'using', 'void', 'while'].map(keyword),
      snippet('main', 'int main() {\n\t${0:return 0;}\n}', 'C++ main function'),
      snippet('cout', 'std::cout << ${1:value} << std::endl;', 'C++ output'),
    ],
    c: [
      ...['auto', 'break', 'case', 'char', 'const', 'continue', 'double', 'else', 'enum', 'float', 'for', 'if', 'include', 'int', 'long', 'printf', 'return', 'short', 'sizeof', 'static', 'struct', 'switch', 'void', 'while'].map(keyword),
      snippet('main', 'int main(void) {\n\t${0:return 0;}\n}', 'C main function'),
      snippet('printf', 'printf("${1:%s}\\n"${2:, value});', 'C print'),
    ],
    go: [
      ...['break', 'case', 'chan', 'const', 'continue', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var', 'fmt'].map(keyword),
      snippet('main', 'func main() {\n\t${0}\n}', 'Go main function'),
      snippet('printf', 'fmt.Printf("${1:%v}\\n", ${2:value})', 'Go printf'),
    ],
    rust: [
      ...['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'fn', 'for', 'if', 'impl', 'let', 'loop', 'match', 'mod', 'mut', 'pub', 'return', 'self', 'struct', 'trait', 'use', 'where', 'while'].map(keyword),
      snippet('main', 'fn main() {\n\t${0}\n}', 'Rust main function'),
      snippet('println', 'println!("${1:{}}", ${2:value});', 'Rust print'),
    ],
    html: [
      ...['html', 'head', 'body', 'div', 'span', 'button', 'input', 'label', 'section', 'main', 'header', 'footer', 'script', 'style', 'class', 'id'].map(keyword),
      snippet('html5', '<!doctype html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8" />\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${0}\n</body>\n</html>', 'HTML document'),
    ],
    css: [
      ...['align-items', 'background', 'border', 'color', 'display', 'flex', 'font-size', 'gap', 'grid', 'height', 'justify-content', 'margin', 'padding', 'position', 'width'].map(keyword),
      snippet('flex', 'display: flex;\nalign-items: ${1:center};\njustify-content: ${2:center};', 'Flex layout'),
    ],
  };

  return items[languageId] || common;
}

function getDocumentWordCompletionItems(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] {
  const words = new Set(model.getValue().match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || []);
  return Array.from(words).slice(0, 120).map((word) => ({
    label: word,
    kind: monaco.languages.CompletionItemKind.Text,
    insertText: word,
    detail: 'Current document',
    range,
  }));
}

async function handleSave(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  filePath: string,
  tabId: string
) {
  if (!editor) return;
  const content = editor.getValue();
  try {
    await fileService.writeFile(filePath, content);
    useEditorStore.getState().saveTab(tabId);
  } catch {
    // Server might not be available; just mark saved locally
    useEditorStore.getState().saveTab(tabId);
  }
}

function formatWithInstalledExtension(value: string, language: string) {
  if (language === 'json') {
    try {
      return `${JSON.stringify(JSON.parse(value), null, 2)}\n`;
    } catch {
      return value;
    }
  }

  if (['javascript', 'typescript', 'tsx', 'jsx', 'css', 'html'].includes(language)) {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+$/g, ''))
      .join('\n')
      .replace(/\n*$/g, '\n');
  }

  return value;
}

function supportsLanguageNotice(installed: ExtensionItem[], language: string) {
  return supportsLanguage(installed, language);
}
