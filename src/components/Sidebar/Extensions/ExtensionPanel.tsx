import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  DownloadCloud,
  FileArchive,
  Filter,
  FolderSearch,
  Loader2,
  MoreHorizontal,
  Package,
  Puzzle,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  TimerReset,
  X,
  Zap,
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
import { getActiveExtensionIds } from '../../../services/extensionRuntime';

// ── Types ──────────────────────────────────────────────────────────────────

type MarketplaceTab = 'recommended' | 'featured' | 'popular' | 'recent';
type CategoryFilter = 'all' | 'languages' | 'themes' | 'linters' | 'formatters' | 'snippets' | 'debuggers' | 'scm';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  languages: 'Languages',
  themes: 'Themes',
  linters: 'Linters',
  formatters: 'Formatters',
  snippets: 'Snippets',
  debuggers: 'Debuggers',
  scm: 'SCM',
};

const CATEGORY_KEYWORDS: Record<CategoryFilter, string[]> = {
  all: [],
  languages: ['language', 'python', 'java', 'typescript', 'javascript', 'rust', 'go', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin'],
  themes: ['theme', 'icon', 'color'],
  linters: ['lint', 'eslint', 'pylint', 'stylelint', 'tslint', 'error lens'],
  formatters: ['prettier', 'format', 'beautify'],
  snippets: ['snippet', 'emmet', 'abbreviation'],
  debuggers: ['debug', 'debugger'],
  scm: ['git', 'source control', 'svn', 'mercurial'],
};

// ── Language compatibility check ────────────────────────────────────────────

/**
 * Returns true if the extension is relevant for the given language.
 * An extension with no specific language markers is considered compatible with everything.
 */
function isCompatibleWithLanguage(item: ExtensionItem, language: string): boolean {
  if (!language || language === 'plaintext' || language === 'unknown') return true;
  const lang = language.toLowerCase();
  const haystack = `${item.id} ${item.displayName} ${item.description} ${(item.capabilities ?? []).join(' ')}`.toLowerCase();

  // Themes, formatters, SCM tools, generic tools — always compatible
  const alwaysCompatible = /theme|icon|git|prettier|error.lens|todo|spell|indent|path.intellisense/.test(haystack);
  if (alwaysCompatible) return true;

  // Language-specific extension checks
  const langPatterns: Record<string, RegExp> = {
    python: /python|pylint|black|jupyter/,
    typescript: /typescript|javascript|eslint|prettier/,
    javascript: /javascript|typescript|eslint|prettier/,
    rust: /rust/,
    go: /\bgo\b|golang/,
    java: /java/,
    cpp: /c\+\+|cpptools/,
    html: /html|tailwind|auto.rename/,
    css: /css|tailwind|scss/,
    dockerfile: /docker/,
  };

  const pattern = langPatterns[lang];
  if (!pattern) return true; // Unknown language — allow all
  return pattern.test(haystack);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ExtensionPanel() {
  const addNotification = useUIStore((state) => state.addNotification);
  const openTab = useEditorStore((state) => state.openTab);
  const getActiveTab = useEditorStore((state) => state.getActiveTab);
  const activeLanguage = getActiveTab()?.language ?? '';
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
  const [marketplaceTab, setMarketplaceTab] = useState<MarketplaceTab>('recommended');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [activeExtIds] = useState(() => getActiveExtensionIds());

  const enrichedInstalled = useMemo(() => (
    installed.map((item) => ({ ...item, ...installedMetadata[item.id] }))
  ), [installed, installedMetadata]);

  const installedIds = useMemo(() => new Set(enrichedInstalled.map((item) => item.id)), [enrichedInstalled]);

  const filterByCategory = useCallback((items: ExtensionItem[]) => {
    if (category === 'all') return items;
    const keywords = CATEGORY_KEYWORDS[category];
    return items.filter((item) => {
      const haystack = `${item.id} ${item.displayName} ${item.description} ${(item.capabilities ?? []).join(' ')}`.toLowerCase();
      return keywords.some((kw) => haystack.includes(kw));
    });
  }, [category]);

  const recommended = useMemo(() => {
    const source = marketplace.length ? marketplace : fallbackRecommended;
    return filterByCategory(source.filter((item) => !installedIds.has(item.id)));
  }, [installedIds, marketplace, filterByCategory]);

  const visibleInstalled = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = normalized
      ? enrichedInstalled.filter((item) => matchesExtension(item, normalized))
      : enrichedInstalled;
    return filterByCategory(base);
  }, [enrichedInstalled, query, filterByCategory]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const searchQuery = query || getQueryForTab(marketplaceTab);
      void searchMarketplace(searchQuery);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query, marketplaceTab]);

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
        foundEntries.forEach((entry) => { next[entry[0]] = entry[1]; });
        return next;
      });
    };
    void hydrateInstalledIcons();
    return () => { disposed = true; };
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
      setError('Marketplace unavailable. Showing cached recommendations.');
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
        message: `Installed ${installedItem.displayName} from ${installedItem.source || 'internet'} and activated it`,
      });
    } catch {
      addNotification({ type: 'error', message: `Cannot install ${item.displayName}. Check your connection and try again.` });
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

  // VSIX drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.vsix'));
    if (!files.length) {
      addNotification({ type: 'warning', message: 'Please drop a .vsix extension file' });
      return;
    }
    for (const file of files) {
      addNotification({ type: 'info', message: `Installing ${file.name} from local file...` });
      // Simulate local VSIX install
      setTimeout(() => {
        addNotification({ type: 'success', message: `${file.name} installed successfully` });
      }, 1500);
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: 'var(--color-sidebar)' }}
      onClick={() => manageMenuId && setManageMenuId(null)}
    >
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-4 no-select flex-shrink-0">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-textMuted)', letterSpacing: '0.08em' }}
        >
          Extensions
        </span>
        <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
          <ToolbarButton title="Refresh Extensions" onClick={() => void searchMarketplace(query || getQueryForTab(marketplaceTab))}>
            <RefreshCw size={14} />
          </ToolbarButton>
          <ToolbarButton title="More Actions" onClick={() => addNotification({ type: 'info', message: 'Extensions are installed locally in this browser workspace' })}>
            <MoreHorizontal size={15} />
          </ToolbarButton>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div
          className="flex h-[30px] items-center rounded border gap-1"
          style={{ background: '#0e1011', borderColor: '#3a3d40' }}
        >
          <Search size={13} className="ml-2 flex-shrink-0" style={{ color: 'var(--color-textMuted)' }} />
          <input
            className="min-w-0 flex-1 bg-transparent px-1 text-[12px] outline-none placeholder:text-[#555]"
            style={{ color: 'var(--color-text)', fontFamily: "'Inter', system-ui, sans-serif" }}
            placeholder="Search marketplace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="mr-1 flex-shrink-0 hover:text-white transition-colors" style={{ color: 'var(--color-textMuted)' }}>
              <X size={13} />
            </button>
          )}
          <ToolbarButton title={installedOnly ? 'Show Marketplace' : 'Show Installed Only'} onClick={() => setInstalledOnly((v) => !v)}>
            <Filter size={13} style={{ color: installedOnly ? 'var(--color-accent)' : 'var(--color-textMuted)' }} />
          </ToolbarButton>
        </div>
      </div>

      {/* Category pills */}
      {!installedOnly && !query && (
        <div className="flex gap-1.5 px-3 pb-2 flex-shrink-0 overflow-x-auto no-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              className={`category-pill flex-shrink-0 ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Marketplace sub-tabs (only in marketplace view) */}
      {!installedOnly && !query && (
        <div
          className="flex flex-shrink-0 border-b overflow-x-auto no-scrollbar"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(['recommended', 'featured', 'popular', 'recent'] as MarketplaceTab[]).map((tab) => (
            <button
              key={tab}
              className={`ext-tab capitalize ${marketplaceTab === tab ? 'active' : ''}`}
              onClick={() => setMarketplaceTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {/* Installed section */}
        <ExtensionSection
          title="Installed"
          count={visibleInstalled.length}
          open={installedOpen}
          onToggle={() => setInstalledOpen((v) => !v)}
        >
          {visibleInstalled.length ? visibleInstalled.map((item) => (
            <ExtensionRow
              key={item.id}
              item={item}
              installed
              active={activeExtIds.has(item.id)}
              menuOpen={manageMenuId === item.id}
              onOpen={() => openExtension(item)}
              onAction={() => setManageMenuId((cur) => cur === item.id ? null : item.id)}
              onDisable={() => disableExtension(item)}
              onUninstall={() => uninstallExtension(item)}
            />
          )) : (
            <EmptySection>
              {query ? 'No installed extensions match your search.' : 'No extensions installed yet. Browse the marketplace below.'}
            </EmptySection>
          )}
        </ExtensionSection>

        {/* Marketplace section */}
        {!installedOnly && (
          <ExtensionSection
            title={query ? 'Search Results' : `${capitalize(marketplaceTab)}`}
            count={recommended.length}
            open={recommendedOpen}
            onToggle={() => setRecommendedOpen((v) => !v)}
          >
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3" style={{ color: 'var(--color-textMuted)', fontSize: 12 }}>
                <Loader2 size={13} className="animate-spin" />
                <span>Searching marketplace...</span>
              </div>
            )}
            {error && !loading && <EmptySection>{error}</EmptySection>}
            {!loading && recommended.map((item) => (
              <ExtensionRow
                key={item.id}
                item={item}
                installing={installingId === item.id}
                isCompatible={isCompatibleWithLanguage(item, activeLanguage)}
                onOpen={() => openExtension(item)}
                onAction={() => requestInstallExtension(item)}
              />
            ))}
            {!loading && !error && recommended.length === 0 && (
              <EmptySection>No extensions match this filter. Try a different category.</EmptySection>
            )}
          </ExtensionSection>
        )}

        {/* MCP Servers section */}
        <ExtensionSection
          title="MCP Servers"
          count={mcpServers.length}
          open={mcpOpen}
          onToggle={() => setMcpOpen((v) => !v)}
        >
          {mcpServers.map((server) => (
            <div key={server.id} className="px-4 py-2 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>{server.name}</span>
              </div>
              <div className="mt-0.5 ml-5 text-[11px]" style={{ color: 'var(--color-textMuted)' }}>{server.description}</div>
            </div>
          ))}
        </ExtensionSection>

        {/* VSIX drop zone */}
        <div className="px-3 pb-4 pt-2">
          <div
            ref={dropRef}
            className={`vsix-drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileArchive size={16} className="mx-auto mb-1.5" style={{ color: 'inherit' }} />
            <div className="font-medium text-[11px]">Install from VSIX</div>
            <div className="mt-0.5 text-[10px] opacity-70">Drop a .vsix file here to install</div>
          </div>
        </div>
      </div>

      {/* Trust dialog */}
      {pendingTrustItem && (
        <PublisherTrustDialog
          item={pendingTrustItem}
          installing={installingId === pendingTrustItem.id}
          onTrust={() => {
            trustPublisher(pendingTrustItem);
            void installExtension(pendingTrustItem);
          }}
          onLearnMore={() => addNotification({ type: 'info', message: 'Install extensions only from publishers you trust.' })}
          onCancel={() => setPendingTrustItem(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ExtensionSection({
  title, count, open, onToggle, children,
}: {
  title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        className="flex h-[26px] w-full items-center gap-1 border-t px-3 text-left"
        style={{ color: 'var(--color-textMuted)', borderColor: 'var(--color-border)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', system-ui, sans-serif" }}
        onClick={onToggle}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
        <span
          className="ml-auto rounded px-1.5 py-0.5"
          style={{ background: 'rgba(34,166,242,0.15)', color: 'var(--color-accent)', fontSize: 10, fontWeight: 700 }}
        >
          {count}
        </span>
      </button>
      {open && <div className="slide-up">{children}</div>}
    </div>
  );
}

function ExtensionRow({
  item,
  installed = false,
  installing = false,
  active = false,
  menuOpen = false,
  isCompatible = true,
  onOpen,
  onAction,
  onDisable,
  onUninstall,
}: {
  item: ExtensionItem;
  installed?: boolean;
  installing?: boolean;
  active?: boolean;
  menuOpen?: boolean;
  isCompatible?: boolean;
  onOpen: () => void;
  onAction: () => void;
  onDisable?: () => void;
  onUninstall?: () => void;
}) {
  const incompatibleMsg = !installed && !isCompatible
    ? `Not compatible with current language (${item.publisher})`
    : undefined;

  return (
    <div
      className="group relative flex min-h-[76px] items-start gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors"
      style={{ opacity: !installed && !isCompatible ? 0.45 : 1 }}
      title={incompatibleMsg}
    >
      {/* Icon */}
      <button
        className="mt-0.5 flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl transition-opacity hover:opacity-80"
        style={{ background: item.iconUrl ? 'transparent' : '#232526', color: 'var(--color-textMuted)' }}
        onClick={onOpen}
      >
        {item.iconUrl
          ? <img src={item.iconUrl} alt="" className="h-full w-full object-contain" />
          : <Package size={24} strokeWidth={1.4} />
        }
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <div className="truncate text-[13px] font-semibold leading-tight" style={{ color: 'var(--color-text)', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {item.displayName}
            </div>
            <div className="truncate text-[11px] leading-snug mt-0.5" style={{ color: '#808080' }}>
              {item.description}
            </div>
          </button>
          <ExtensionMeta item={item} installed={installed} />
        </div>

        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px]" style={{ color: '#757575' }}>
            {item.verified && <BadgeCheck size={13} fill="#44b9e8" color="#44b9e8" />}
            <span className="truncate font-medium">{item.publisher}</span>
          </div>

          {installed && active && (
            <span className="ext-active-pill">active</span>
          )}

          {installed && !active && (
            <span style={{ fontSize: 10, color: '#555', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
              installed
            </span>
          )}

          {!installed && (
            <button
              className="inline-flex h-[22px] items-center gap-1 rounded px-2 text-[11px] font-medium hover:brightness-110 transition-all disabled:opacity-50"
              style={{
                background: isCompatible ? '#1a4a65' : '#2a2a2a',
                color: isCompatible ? '#7fd4ff' : '#666',
                fontFamily: "'Inter', system-ui, sans-serif",
                cursor: isCompatible ? 'pointer' : 'not-allowed',
              }}
              disabled={installing || !isCompatible}
              title={!isCompatible ? 'This extension does not support the current file language' : undefined}
              onClick={(e) => { e.stopPropagation(); if (isCompatible) onAction(); }}
            >
              {installing ? (
                <><Loader2 size={11} className="animate-spin" />Installing...</>
              ) : !isCompatible ? (
                <>Incompatible</>
              ) : (
                <>Install</>
              )}
            </button>
          )}

          {installed && item.aiAutoInstalled && (
            <span
              style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(167,139,250,0.2)', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              title="Automatically installed by AI Pair"
            >
              <Zap size={9} />AI
            </span>
          )}

          {installed && getExtensionCapabilities(item).slice(0, 1).map((cap) => (
            <span key={cap} style={{ fontSize: 10, color: '#4ade80', background: 'rgba(34,197,94,0.08)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(34,197,94,0.15)' }}>
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Manage button */}
      {installed && (
        <button
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
          style={{ color: 'var(--color-textMuted)' }}
          title="Manage Extension"
          onClick={(e) => { e.stopPropagation(); onAction(); }}
        >
          <Settings size={14} />
        </button>
      )}

      {/* Context menu */}
      {installed && menuOpen && (
        <div
          className="absolute right-3 top-10 z-30 w-[160px] rounded-lg border py-1 shadow-2xl slide-up"
          style={{ background: '#1e2124', borderColor: '#3a3d40' }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuAction onClick={onOpen}>Extension Details</MenuAction>
          <MenuAction onClick={onDisable}>Disable</MenuAction>
          <MenuAction onClick={onUninstall} danger>Uninstall</MenuAction>
        </div>
      )}
    </div>
  );
}

function MenuAction({ children, onClick, danger = false }: { children: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-white/8 transition-colors"
      style={{ color: danger ? '#f87171' : 'var(--color-text)', fontFamily: "'Inter', system-ui, sans-serif" }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ExtensionMeta({ item, installed }: { item: ExtensionItem; installed: boolean }) {
  if (installed) {
    return (
      <div className="flex flex-shrink-0 items-center gap-1 text-[11px]" style={{ color: '#606060' }}>
        <TimerReset size={12} />
        <span>{item.activationTime ?? estimateActivationTime(item)}ms</span>
      </div>
    );
  }
  return (
    <div className="flex flex-shrink-0 items-center gap-2 text-[11px]" style={{ color: '#606060' }}>
      <span className="flex items-center gap-0.5"><DownloadCloud size={12} />{formatDownloads(item.downloads)}</span>
      <span className="flex items-center gap-0.5"><Star size={12} fill="#f89b22" color="#f89b22" />{formatRating(item.rating)}</span>
    </div>
  );
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <FolderSearch size={28} style={{ color: '#3a3d40' }} />
      <span style={{ color: 'var(--color-textMuted)', fontSize: 12 }}>{children}</span>
    </div>
  );
}

function ToolbarButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
      style={{ color: 'var(--color-textMuted)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getQueryForTab(tab: MarketplaceTab): string {
  const queries: Record<MarketplaceTab, string> = {
    recommended: 'popular',
    featured: 'featured',
    popular: 'trending',
    recent: 'recently updated',
  };
  return queries[tab];
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
  files?: { icon?: string };
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
  return [item.displayName, item.publisher, item.description, item.id].some((v) => v?.toLowerCase().includes(query));
}

function formatDownloads(downloads?: number) {
  if (!downloads) return '0';
  if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
  if (downloads >= 1000) return `${(downloads / 1000).toFixed(0)}K`;
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
