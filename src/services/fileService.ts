import axios from 'axios';
import { FileNode, FileContent } from '../types/file.types';

const BASE_URL = '/api';

export const fileService = {
  async getFileTree(workspacePath: string): Promise<FileNode[]> {
    const { data } = await axios.get(`${BASE_URL}/files/tree`, {
      params: { path: workspacePath },
    });
    return data;
  },

  async readFile(filePath: string): Promise<FileContent> {
    const { data } = await axios.get(`${BASE_URL}/files/read`, {
      params: { path: filePath },
    });
    return data;
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    await axios.post(`${BASE_URL}/files/write`, { path: filePath, content });
  },

  async createFile(filePath: string, content = ''): Promise<FileNode> {
    const { data } = await axios.post(`${BASE_URL}/files/create`, {
      path: filePath,
      content,
      type: 'file',
    });
    return data;
  },

  async createFolder(folderPath: string): Promise<FileNode> {
    const { data } = await axios.post(`${BASE_URL}/files/create`, {
      path: folderPath,
      type: 'directory',
    });
    return data;
  },

  async deleteFile(filePath: string): Promise<void> {
    await axios.delete(`${BASE_URL}/files/delete`, {
      data: { path: filePath },
    });
  },

  async renameFile(oldPath: string, newPath: string): Promise<FileNode> {
    const { data } = await axios.put(`${BASE_URL}/files/rename`, {
      oldPath,
      newPath,
    });
    return data;
  },

  async searchFiles(query: string, workspacePath: string): Promise<FileNode[]> {
    const { data } = await axios.get(`${BASE_URL}/files/search`, {
      params: { query, path: workspacePath },
    });
    return data;
  },

  getLanguageFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', rb: 'ruby', java: 'java', cpp: 'cpp', c: 'c',
      cs: 'csharp', go: 'go', rs: 'rust', php: 'php', swift: 'swift',
      kt: 'kotlin', html: 'html', css: 'css', scss: 'scss', less: 'less',
      json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', md: 'markdown',
      sh: 'shell', bash: 'shell', sql: 'sql', dockerfile: 'dockerfile',
      toml: 'toml', ini: 'ini', env: 'plaintext', txt: 'plaintext',
    };
    return langMap[ext] || 'plaintext';
  },
};
