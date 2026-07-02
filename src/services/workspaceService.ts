import axios from 'axios';
import { Workspace } from '../types/workspace.types';

const BASE_URL = '/api/workspace';

export const workspaceService = {
  async createWorkspace(name: string): Promise<Workspace> {
    const { data } = await axios.post(`${BASE_URL}/create`, { name });
    return data;
  },

  async openWorkspace(path: string): Promise<Workspace> {
    const { data } = await axios.post(`${BASE_URL}/open`, { path });
    return data;
  },

  async getWorkspaces(): Promise<Workspace[]> {
    const { data } = await axios.get(`${BASE_URL}/list`);
    return data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const { data } = await axios.get(`${BASE_URL}/${id}`);
    return data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },

  getDefaultWorkspace(): Workspace {
    return {
      id: 'default',
      name: 'my-project',
      path: '/workspace/my-project',
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
    };
  },
};
