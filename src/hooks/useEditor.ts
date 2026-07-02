import { useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useFileStore } from '../store/fileStore';
import { fileService } from '../services/fileService';
import { getLanguageFromExtension } from '../utils/fileHelpers';
import { v4 as uuidv4 } from '../utils/uuid';

export function useEditor() {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab, getActiveTab, updateTabContent } = useEditorStore();
  const { fileTree } = useFileStore();

  const openFile = useCallback(async (filePath: string, fileName: string) => {
    const existing = tabs.find(t => t.filePath === filePath);
    if (existing) {
      setActiveTab(existing.id);
      return;
    }

    let content = '';
    try {
      const result = await fileService.readFile(filePath);
      content = result.content;
    } catch {
      content = `// ${fileName}\n`;
    }

    const tabId = `tab-${uuidv4()}`;
    openTab({
      id: tabId,
      fileId: `file-${uuidv4()}`,
      filePath,
      fileName,
      language: getLanguageFromExtension(fileName),
      content,
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
  }, [tabs, openTab, setActiveTab]);

  const saveCurrentFile = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab || !tab.isDirty) return;
    try {
      await fileService.writeFile(tab.filePath, tab.content);
      useEditorStore.getState().saveTab(tab.id);
    } catch {
      // ignore - might be mock file
      useEditorStore.getState().saveTab(tab.id);
    }
  }, [getActiveTab]);

  return {
    tabs,
    activeTabId,
    activeTab: getActiveTab(),
    openFile,
    closeTab,
    setActiveTab,
    saveCurrentFile,
  };
}
