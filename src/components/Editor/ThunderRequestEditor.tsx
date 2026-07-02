import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { HttpMethod, KeyValueRow, parseThunderRequest, ThunderRequest, useThunderStore } from '../../store/thunderStore';
import { useEditorStore } from '../../store/editorStore';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const requestTabs = ['Query', 'Headers', 'Auth', 'Body', 'Tests', 'Pre Run'] as const;
type RequestTab = typeof requestTabs[number];

interface ThunderRequestEditorProps {
  tabId: string;
  content: string;
}

export default function ThunderRequestEditor({ tabId, content }: ThunderRequestEditorProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('Query');
  const [responseOpen, setResponseOpen] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const request = useMemo(() => parseThunderRequest(content), [content]);
  const updateTabContent = useEditorStore((state) => state.updateTabContent);
  const addActivity = useThunderStore((state) => state.addActivity);

  const updateRequest = (patch: Partial<ThunderRequest>) => {
    updateTabContent(tabId, JSON.stringify({ ...request, ...patch }, null, 2));
  };

  const send = async () => {
    setSending(true);
    setStatus(null);
    setSize(null);
    setTime(null);
    setResponseText('');

    const started = performance.now();
    const url = buildUrl(request);
    const headers = buildHeaders(request);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body || undefined,
      });
      const text = await response.text();
      const elapsed = Math.round(performance.now() - started);
      setStatus(response.status);
      setSize(text.length);
      setTime(elapsed);
      setResponseText(prettyResponse(text, response.headers.get('content-type') || ''));
      addActivity({ method: request.method, url, status: response.status, time: elapsed });
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      setTime(elapsed);
      setResponseText(error instanceof Error ? error.message : 'Request failed');
      addActivity({ method: request.method, url, time: elapsed });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#111314', color: 'var(--color-text)' }}>
      <div className="flex h-[106px] flex-shrink-0 flex-col border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-1 items-center gap-0 px-6">
          <select
            className="h-[50px] w-[98px] rounded-l-md border bg-transparent px-3 text-[20px] outline-none"
            style={{ borderColor: '#3a3a3a', color: 'var(--color-text)' }}
            value={request.method}
            onChange={(event) => updateRequest({ method: event.target.value as HttpMethod })}
          >
            {methods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
          <input
            className="h-[50px] min-w-0 flex-1 border-y bg-transparent px-3 text-[20px] outline-none"
            style={{ borderColor: '#3a3a3a', color: 'var(--color-text)' }}
            value={request.url}
            onChange={(event) => updateRequest({ url: event.target.value })}
          />
          <button
            className="h-[50px] w-[98px] rounded-r-md text-[20px] font-medium disabled:opacity-60"
            style={{ background: '#2f86ad', color: '#ffffff' }}
            onClick={send}
            disabled={sending}
          >
            {sending ? 'Sending' : 'Send'}
          </button>
        </div>

        <div className="flex h-[44px] items-end gap-7 px-6">
          {requestTabs.map((tab) => (
            <button
              key={tab}
              className="h-full border-b-2 px-1 text-[18px]"
              style={{ color: activeTab === tab ? 'var(--color-text)' : '#a8a8a8', borderColor: activeTab === tab ? '#35a6dd' : 'transparent' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}{tab === 'Headers' && <sup className="ml-1 text-[#35a6dd]">{request.headers.filter((row) => row.enabled && row.key).length}</sup>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-[326px] flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'Query' && <KeyValueEditor title="Query Parameters" rows={request.query} onChange={(query) => updateRequest({ query })} />}
          {activeTab === 'Headers' && <KeyValueEditor title="Headers" rows={request.headers} onChange={(headers) => updateRequest({ headers })} />}
          {activeTab === 'Auth' && <AuthEditor request={request} onChange={updateRequest} />}
          {activeTab === 'Body' && <TextEditor title="Body" value={request.body} onChange={(body) => updateRequest({ body })} placeholder="{ }" />}
          {activeTab === 'Tests' && <TextEditor title="Tests" value={request.tests} onChange={(tests) => updateRequest({ tests })} placeholder="// Write response tests here" />}
          {activeTab === 'Pre Run' && <TextEditor title="Pre Run" value={request.preRun} onChange={(preRun) => updateRequest({ preRun })} placeholder="// Script to run before request" />}
        </div>

        <div className="h-[61px] flex-shrink-0 border-y px-9 text-[20px]" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex h-full items-center gap-8">
            <strong>Status:</strong><span>{status ?? ''}</span>
            <strong>Size:</strong><span>{size !== null ? `${size} B` : ''}</span>
            <strong>Time:</strong><span>{time !== null ? `${time} ms` : ''}</span>
            <button className="ml-auto flex items-center gap-2" onClick={() => setResponseOpen((value) => !value)}>
              Response <ChevronDown size={20} className={responseOpen ? '' : '-rotate-90'} />
            </button>
          </div>
        </div>

        {responseOpen && (
          <div className="min-h-[240px] flex-1 overflow-auto p-8">
            {responseText ? (
              <pre className="whitespace-pre-wrap text-[14px]" style={{ color: '#d4d4d4' }}>{responseText}</pre>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-[20px] leading-[2.2]" style={{ color: '#9f9f9f' }}>
                <div>JetBrains Plugin <span className="rounded bg-green-700 px-1 text-[16px] text-white">New</span></div>
                <div>Thunder Client plugin is now available for JetBrains IDEs.</div>
                <button className="text-[#35a6dd]">Download</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyValueEditor({ title, rows, onChange }: { title: string; rows: KeyValueRow[]; onChange: (rows: KeyValueRow[]) => void }) {
  const updateRow = (id: string, patch: Partial<KeyValueRow>) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  const removeRow = (id: string) => onChange(rows.filter((row) => row.id !== id));
  const addRow = () => onChange([...rows, { id: `row-${Date.now()}`, enabled: true, key: '', value: '' }]);

  return (
    <div>
      <h2 className="mb-6 text-[24px] font-normal">{title}</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[30px_1fr_1fr_30px] items-center gap-4">
            <input type="checkbox" checked={row.enabled} onChange={(event) => updateRow(row.id, { enabled: event.target.checked })} />
            <input className="border-b bg-transparent px-1 py-2 text-[18px] outline-none" style={{ borderColor: '#4a4a4a', color: 'var(--color-text)' }} placeholder="parameter" value={row.key} onChange={(event) => updateRow(row.id, { key: event.target.value })} />
            <input className="border-b bg-transparent px-1 py-2 text-[18px] outline-none" style={{ borderColor: '#4a4a4a', color: 'var(--color-text)' }} placeholder="value" value={row.value} onChange={(event) => updateRow(row.id, { value: event.target.value })} />
            <button title="Remove" onClick={() => removeRow(row.id)}><Trash2 size={17} /></button>
          </div>
        ))}
      </div>
      <button className="mt-5 flex items-center gap-2 text-[#35a6dd]" onClick={addRow}><Plus size={18} /> Add</button>
    </div>
  );
}

function AuthEditor({ request, onChange }: { request: ThunderRequest; onChange: (patch: Partial<ThunderRequest>) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[24px] font-normal">Auth</h2>
      <select className="h-9 rounded border bg-transparent px-2" style={{ borderColor: '#4a4a4a' }} value={request.authType} onChange={(event) => onChange({ authType: event.target.value as ThunderRequest['authType'] })}>
        <option value="none">No Auth</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
      </select>
      {request.authType === 'bearer' && <input className="block w-full border-b bg-transparent px-1 py-2 outline-none" style={{ borderColor: '#4a4a4a' }} placeholder="Bearer token" value={request.bearerToken} onChange={(event) => onChange({ bearerToken: event.target.value })} />}
      {request.authType === 'basic' && (
        <div className="grid grid-cols-2 gap-4">
          <input className="border-b bg-transparent px-1 py-2 outline-none" style={{ borderColor: '#4a4a4a' }} placeholder="Username" value={request.basicUsername} onChange={(event) => onChange({ basicUsername: event.target.value })} />
          <input className="border-b bg-transparent px-1 py-2 outline-none" style={{ borderColor: '#4a4a4a' }} placeholder="Password" value={request.basicPassword} onChange={(event) => onChange({ basicPassword: event.target.value })} />
        </div>
      )}
    </div>
  );
}

function TextEditor({ title, value, onChange, placeholder }: { title: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="h-full">
      <h2 className="mb-4 text-[24px] font-normal">{title}</h2>
      <textarea className="h-[220px] w-full resize-none rounded border bg-transparent p-3 font-mono text-[14px] outline-none" style={{ borderColor: '#4a4a4a', color: 'var(--color-text)' }} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function buildUrl(request: ThunderRequest) {
  const url = new URL(request.url);
  request.query.filter((row) => row.enabled && row.key).forEach((row) => url.searchParams.set(row.key, row.value));
  return url.toString();
}

function buildHeaders(request: ThunderRequest) {
  const headers = new Headers();
  request.headers.filter((row) => row.enabled && row.key).forEach((row) => headers.set(row.key, row.value));
  if (request.authType === 'bearer' && request.bearerToken) headers.set('Authorization', `Bearer ${request.bearerToken}`);
  if (request.authType === 'basic' && request.basicUsername) headers.set('Authorization', `Basic ${btoa(`${request.basicUsername}:${request.basicPassword}`)}`);
  return headers;
}

function prettyResponse(text: string, contentType: string) {
  if (contentType.includes('application/json')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
}
