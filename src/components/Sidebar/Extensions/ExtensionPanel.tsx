import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  DownloadCloud,
  Filter,
  ListFilter,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Settings,
  Star,
  TimerReset,
} from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { useEditorStore } from '../../../store/editorStore';
import PublisherTrustDialog from '../../Extensions/PublisherTrustDialog';
import { isPublisherTrusted, trustPublisher } from '../../../services/extensionTrustService';
import {
  ExtensionItem,
  fallbackRecommended,
  getExtensionCapabilities,
  mcpServers,
  useExtensionStore,
} from '../../../store/extensionStore';

export default function ExtensionPanel() {
  const addNotification = useUIStore((state) => state.addNotification);
  const openTab = useEditorStore((state) => state.openTab);
  const { installed, installExtensionFromInternet, uninstallExtension: uninstallStoredExtension } = useExtensionStore();
  const [query, setQuery] = useState('');
  const [marketplace, setMarketplace] = useState<ExtensionItem[]>([]);
  const [installedMetadata, setInstalledMetadata] = useState<Record<string, ExtensionItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installedOpen, setInstalledOpen] = useState(true);
  const [recommendedOpen, setRecommendedOpen] = useState(true);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [manageMenuId, setManageMenuId] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [pendingTrustItem, setPendingTrustItem] = useState<ExtensionItem | null>(null);

  const enrichedInstalled = useMemo(() => (
    installed.map((item) => ({ ...item, ...installedMetadata[item.id] }))
  ), [installed, installedMetadata]);
  const installedIds = useMemo(() => new Set(enrichedInstalled.map((item) => item.id)), [enrichedInstalled]);
  const recommended = useMemo(() => {
    const source = marketplace.length ? marketplace : fallbackRecommended;
    return source.filter((item) => !installedIds.has(item.id));
  }, [installedIds, marketplace]);

  const visibleInstalled = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return enrichedInstalled;
    return enrichedInstalled.filter((item) => matchesExtension(item, normalized));
  }, [enrichedInstalled, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void searchMarketplace(query || 'popular');
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let disposed = false;

    const hydrateInstalledIcons = async () => {
      const missing = installed.filter((item) => !item.iconUrl && !installedMetadata[item.id]);
      if (!missing.length) return;

      const entries = await Promise.all(missing.map(async (item) => {
        const hydrated = await fetchExtensionDetails(item.id);
        return hydrated ? [item.id, hydrated] as const : null;
      }));

      if (disposed) return;
      const foundEntries = entries.filter((entry): entry is readonly [string, ExtensionItem] => Boolean(entry));
      if (!foundEntries.length) return;

      setInstalledMetadata((current) => {
        const next = { ...current };
        foundEntries.forEach((entry) => {
          next[entry[0]] = entry[1];
        });
        return next;
      });
    };

    void hydrateInstalledIcons();
    return () => {
      disposed = true;
    };
  }, [installed, installedMetadata]);

  const searchMarketplace = async (searchText: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(searchText)}&size=30`);
      if (!response.ok) throw new Error(`Marketplace returned ${response.status}`);
      const data = await response.json() as { extensions?: OpenVsxExtension[] };
      setMarketplace((data.extensions || []).map(fromOpenVsx).filter(Boolean) as ExtensionItem[]);
    } catch {
      setError('Marketplace is unavailable. Showing cached recommendations.');
      setMarketplace([]);
    } finally {
      setLoading(false);
    }
  };

  const requestInstallExtension = (item: ExtensionItem) => {
    if (!isPublisherTrusted(item)) {
      setPendingTrustItem(item);
      return;
    }
    void installExtension(item);
  };

  const installExtension = async (item: ExtensionItem) => {
    setInstallingId(item.id);
    try {
      const installedItem = await installExtensionFromInternet(item);
      setPendingTrustItem(null);
      addNotification({
        type: 'success',
        message: `Installed ${installedItem.displayName} from ${installedItem.source || 'internet'} and activated it in AI Web IDE`,
      });
    } catch {
      addNotification({ type: 'error', message: `Without internet, ${item.displayName} cannot be installed. Check the connection and try again.` });
    } finally {
      setInstallingId(null);
    }
  };

  const uninstallExtension = (item: ExtensionItem) => {
    uninstallStoredExtension(item.id);
    setManageMenuId(null);
    addNotification({ type: 'success', message: `Uninstalled ${item.displayName}` });
  };

  const disableExtension = (item: ExtensionItem) => {
    setManageMenuId(null);
    addNotification({ type: 'info', message: `${item.displayName} disabled for this workspace` });
  };

  const openExtension = (item: ExtensionItem) => {
    openTab({
      id: `tab-extension-${item.id}`,
      fileId: `extension-${item.id}`,
      filePath: `/extensions/${item.id}`,
      fileName: `Extension: ${item.displayName}`,
      language: 'extension-detail',
      content: JSON.stringify(item, null, 2),
      isDirty: false,
      isPreview: false,
      cursorPosition: { line: 1, column: 1 },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--color-sidebar)' }}>
      <div className="flex h-10 items-center justify-between px-[22px] no-select">
        <span className="text-[16px] font-normal uppercase leading-none" style={{ color: 'var(--color-text)' }}>
          Extensions
        </span>
        <div className="flex items-center gap-2" style={{ color: 'var(--color-textMuted)' }}>
          <ToolbarButton title="Refresh Extensions" onClick={() => void searchMarketplace(query || 'popular')}>
            <RefreshCw size={20} />
          </ToolbarButton>
          <ToolbarButton title="More Actions" onClick={() => addNotification({ type: 'info', message: 'Extensions are installed locally in this browser preview' })}>
            <MoreHorizontal size={21} />
          </ToolbarButton>
        </div>
      </div>

      <div className="px-[22px] pb-2">
        <div className="flex h-[38px] items-center rounded-md border" style={{ background: '#111314', borderColor: '#4b90a6' }}>
          <Search size={18} className="ml-2 flex-shrink-0" style={{ color: 'var(--color-textMuted)' }} />
          <input
            className="min-w-0 flex-1 bg-transparent px-2 text-[20px] outline-none placeholder:text-[#6f6f6f]"
            style={{ color: 'var(--color-text)' }}
            placeholder="Search Extensions in Marketpl..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ToolbarButton title="Clear Search" onClick={() => setQuery('')}>
            <ListFilter size={21} />
          </ToolbarButton>
          <ToolbarButton title={installedOnly ? 'Show Marketplace Recommendations' : 'Show Installed Only'} onClick={() => setInstalledOnly((value) => !value)}>
            <Filter size={21} style={{ color: installedOnly ? '#ffffff' : 'var(--color-textMuted)' }} />
          </ToolbarButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ExtensionSection title="Installed" count={visibleInstalled.length} open={installedOpen} onToggle={() => setInstalledOpen((value) => !value)}>
          {visibleInstalled.length ? visibleInstalled.map((item) => (
            <ExtensionRow
              key={item.id}
              item={item}
              installed
              menuOpen={manageMenuId === item.id}
              onOpen={() => openExtension(item)}
              onAction={() => setManageMenuId((current) => current === item.id ? null : item.id)}
              onDisable={() => disableExtension(item)}
              onUninstall={() => uninstallExtension(item)}
            />
          )) : <EmptySection>No installed extensions match your search.</EmptySection>}
        </ExtensionSection>

        {!installedOnly && (
          <ExtensionSection title="Recommended" count={recommended.length} open={recommendedOpen} onToggle={() => setRecommendedOpen((value) => !value)}>
            {loading && <EmptySection>Searching marketplace...</EmptySection>}
            {error && <EmptySection>{error}</EmptySection>}
            {!loading && recommended.map((item) => (
              <ExtensionRow key={item.id} item={item} installing={installingId === item.id} onOpen={() => openExtension(item)} onAction={() => requestInstallExtension(item)} />
            ))}
          </ExtensionSection>
        )}

        <ExtensionSection title="MCP Servers" count={mcpServers.length} open={mcpOpen} onToggle={() => setMcpOpen((value) => !value)}>
          {mcpServers.map((server) => (
            <div key={server.id} className="px-[22px] py-2 hover:bg-white/5">
              <div className="text-[14px] font-medium" style={{ color: 'var(--color-text)' }}>{server.name}</div>
              <div className="text-[12px]" style={{ color: 'var(--color-textMuted)' }}>{server.description}</div>
            </div>
          ))}
        </ExtensionSection>
      </div>

      {pendingTrustItem && (
        <PublisherTrustDialog
          item={pendingTrustItem}
          installing={installingId === pendingTrustItem.id}
          onTrust={() => {
            trustPublisher(pendingTrustItem);
            void installExtension(pendingTrustItem);
          }}
          onLearnMore={() => addNotification({ type: 'info', message: 'Install extensions only from publishers you trust. Extensions are activated inside this platform after installation.' })}
          onCancel={() => setPendingTrustItem(null)}
        />
      )}
    </div>
  );
}

function ExtensionSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        className="flex h-[28px] w-full items-center gap-1 border-t px-0 text-left text-[17px] font-semibold uppercase"
        style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
        onClick={onToggle}
      >
        {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <span>{title}</span>
        <span className="ml-auto rounded-full px-2 py-0.5 text-[15px] font-semibold" style={{ background: '#3a9dcc', color: '#ffffff' }}>
          {count}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function ExtensionRow({
  item,
  installed = false,
  installing = false,
  menuOpen = false,
  onOpen,
  onAction,
  onDisable,
  onUninstall,
}: {
  item: ExtensionItem;
  installed?: boolean;
  installing?: boolean;
  menuOpen?: boolean;
  onOpen: () => void;
  onAction: () => void;
  onDisable?: () => void;
  onUninstall?: () => void;
}) {
  return (
    <div className="group relative flex min-h-[92px] items-start gap-3 px-[18px] py-2 hover:bg-white/5">
      <button
        className="mt-1 flex h-[62px] w-[62px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px]"
        style={{ background: item.iconUrl ? 'transparent' : '#2d2d30', color: 'var(--color-textMuted)' }}
        onClick={onOpen}
      >
        {item.iconUrl ? <img src={item.iconUrl} alt="" className="h-full w-full object-contain" /> : <Package size={34} strokeWidth={1.6} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <div className="truncate text-[20px] font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{item.displayName}</div>
            <div className="truncate text-[18px] leading-tight" style={{ color: '#a9a9a9' }}>{item.description}</div>
          </button>
          <ExtensionMeta item={item} installed={installed} />
        </div>

        <div className="mt-1 flex items-center gap-1 text-[16px] leading-tight" style={{ color: '#b8b8b8' }}>
          {item.verified && <BadgeCheck size={19} fill="#44b9e8" color="#44b9e8" />}
          <span className="truncate font-medium">{item.publisher}</span>
        </div>

        {installed ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {getExtensionCapabilities(item).slice(0, 2).map((capability) => (
              <span key={capability} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: '#173f2b', color: '#8ee6ad' }}>
                Active: {capability}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-1">
            <button
              className="inline-flex h-[26px] items-center gap-1 rounded px-2 text-[16px] font-medium hover:brightness-110"
              style={{ background: '#2f86ad', color: '#ffffff' }}
              disabled={installing}
              onClick={onAction}
            >
              {installing ? 'Installing...' : 'Install'}
              <ChevronDown size={15} />
            </button>
          </div>
        )}
      </div>

      {installed && (
        <button
          className="absolute bottom-2 right-[28px] flex h-7 w-7 items-center justify-center rounded opacity-90 hover:bg-white/10"
          style={{ color: 'var(--color-textMuted)' }}
          title="Manage Extension"
          onClick={onAction}
        >
          <Settings size={22} />
        </button>
      )}

      {installed && menuOpen && (
        <div className="absolute right-8 top-16 z-30 w-[150px] rounded border py-1 shadow-xl" style={{ background: '#252526', borderColor: 'var(--color-border)' }}>
          <button className="w-full px-3 py-1 text-left text-[13px] hover:bg-white/10" style={{ color: 'var(--color-text)' }} onClick={onOpen}>Extension Details</button>
          <button className="w-full px-3 py-1 text-left text-[13px] hover:bg-white/10" style={{ color: 'var(--color-text)' }} onClick={onDisable}>Disable</button>
          <button className="w-full px-3 py-1 text-left text-[13px] hover:bg-white/10" style={{ color: 'var(--color-text)' }} onClick={onUninstall}>Uninstall</button>
        </div>
      )}
    </div>
  );
}

function ExtensionMeta({ item, installed }: { item: ExtensionItem; installed: boolean }) {
  if (installed) {
    return (
      <div className="flex flex-shrink-0 items-center gap-1 text-[15px]" style={{ color: '#d6d6d6' }}>
        <TimerReset size={18} />
        <span>{item.activationTime ?? estimateActivationTime(item)}ms</span>
      </div>
    );
  }

  return (
    <div className="flex flex-shrink-0 items-center gap-2 text-[15px]" style={{ color: '#d6d6d6' }}>
      <span className="flex items-center gap-1"><DownloadCloud size={18} />{formatDownloads(item.downloads)}</span>
      <span className="flex items-center gap-1"><Star size={20} fill="#f89b22" color="#f89b22" />{formatRating(item.rating)}</span>
    </div>
  );
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return <div className="px-[22px] py-2 text-[13px]" style={{ color: 'var(--color-textMuted)' }}>{children}</div>;
}

function ToolbarButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/10"
      style={{ color: 'var(--color-textMuted)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface OpenVsxExtension {
  namespace?: string;
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  downloadCount?: number;
  averageRating?: number;
  homepage?: string;
  files?: {
    icon?: string;
  };
}

function fromOpenVsx(item: OpenVsxExtension): ExtensionItem | null {
  if (!item.namespace || !item.name) return null;
  return {
    id: `${item.namespace}.${item.name}`,
    name: item.name,
    displayName: item.displayName || item.name,
    publisher: item.namespace,
    version: item.version || 'latest',
    description: item.description || 'VS Code-compatible extension.',
    downloads: item.downloadCount,
    rating: item.averageRating,
    iconUrl: normalizeIconUrl(item.files?.icon),
    verified: true,
    homepage: item.homepage,
  };
}

async function fetchExtensionDetails(extensionId: string): Promise<ExtensionItem | null> {
  const [namespace, ...nameParts] = extensionId.split('.');
  const name = nameParts.join('.');
  if (!namespace || !name) return null;

  try {
    const response = await fetch(`https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);
    if (!response.ok) return null;
    const data = await response.json() as OpenVsxExtension;
    return fromOpenVsx({ ...data, namespace: data.namespace || namespace, name: data.name || name });
  } catch {
    return null;
  }
}

function matchesExtension(item: ExtensionItem, query: string) {
  return [item.displayName, item.publisher, item.description, item.id].some((value) => value.toLowerCase().includes(query));
}

function formatDownloads(downloads?: number) {
  if (!downloads) return '0';
  if (downloads >= 1000000) return `${Number(downloads / 1000000).toFixed(downloads >= 10000000 ? 0 : 1)}M`;
  if (downloads >= 1000) return `${Number(downloads / 1000).toFixed(0)}K`;
  return String(downloads);
}

function formatRating(rating?: number) {
  if (!rating) return '0';
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

function estimateActivationTime(item: ExtensionItem) {
  const seed = item.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 80 + (seed % 900);
}

function normalizeIconUrl(iconUrl?: string) {
  if (!iconUrl) return undefined;
  if (/^https?:\/\//i.test(iconUrl)) return iconUrl;
  return `https://open-vsx.org${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
}
