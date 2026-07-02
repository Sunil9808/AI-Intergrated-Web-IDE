import { create } from 'zustand';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
}

export interface ThunderRequest {
  method: HttpMethod;
  url: string;
  query: KeyValueRow[];
  headers: KeyValueRow[];
  authType: 'none' | 'bearer' | 'basic';
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  body: string;
  tests: string;
  preRun: string;
}

export interface ThunderActivity {
  id: string;
  method: HttpMethod;
  url: string;
  status?: number;
  time?: number;
  timestamp: number;
}

interface ThunderStore {
  activity: ThunderActivity[];
  collections: { id: string; name: string; count: number }[];
  environments: { id: string; name: string; variables: KeyValueRow[] }[];
  addActivity: (activity: Omit<ThunderActivity, 'id' | 'timestamp'>) => void;
  clearActivity: () => void;
  addCollection: (name: string) => void;
  addEnvironment: (name: string) => void;
}

export const defaultThunderRequest: ThunderRequest = {
  method: 'GET',
  url: 'https://www.thunderclient.com/welcome',
  query: [{ id: 'query-1', enabled: false, key: '', value: '' }],
  headers: [
    { id: 'header-1', enabled: true, key: 'Accept', value: 'application/json' },
    { id: 'header-2', enabled: false, key: '', value: '' },
  ],
  authType: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  body: '',
  tests: '',
  preRun: '',
};

export const useThunderStore = create<ThunderStore>((set) => ({
  activity: [],
  collections: [],
  environments: [],
  addActivity: (activity) => set((state) => ({
    activity: [{ ...activity, id: `activity-${Date.now()}`, timestamp: Date.now() }, ...state.activity].slice(0, 50),
  })),
  clearActivity: () => set({ activity: [] }),
  addCollection: (name) => set((state) => ({
    collections: [{ id: `collection-${Date.now()}`, name, count: 0 }, ...state.collections],
  })),
  addEnvironment: (name) => set((state) => ({
    environments: [{ id: `env-${Date.now()}`, name, variables: [] }, ...state.environments],
  })),
}));

export function createThunderTabContent(request: ThunderRequest = defaultThunderRequest) {
  return JSON.stringify(request, null, 2);
}

export function parseThunderRequest(content: string): ThunderRequest {
  try {
    return { ...defaultThunderRequest, ...JSON.parse(content) };
  } catch {
    return defaultThunderRequest;
  }
}
