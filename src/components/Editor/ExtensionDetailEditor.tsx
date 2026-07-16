import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Check,
  DownloadCloud,
  FileJson,
  GitBranch,
  PlugZap,
  Package,
  Palette,
  Power,
  Settings,
  ShieldCheck,
  Loader2,
  PanelLeft,
  Play,
  Star,
  Trash2,
} from 'lucide-react';
import {
  ExtensionItem,
  getExtensionCapabilities,
  useExtensionStore,
} from '../../store/extensionStore';
import { useUIStore } from '../../store/uiStore';
import PublisherTrustDialog from '../Extensions/PublisherTrustDialog';
import { isPublisherTrusted, trustPublisher } from '../../services/extensionTrustService';
import { getActiveExtensionIds } from '../../services/extensionRuntime';
import { getThemeForExtension, applyTheme } from '../../services/extensionThemeService';

interface ExtensionDetailEditorProps {
  content: string;
}

type DetailTab = 'details' | 'features' | 'runtime' | 'changelog';

interface RemoteExtensionDetails {
  item: ExtensionItem;
  readme?: string;
  changelog?: string;
  categories: string[];
  source: string;
}

interface OpenVsxDetail {
  namespace?: string;
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  timestamp?: string;
  downloadCount?: number;
  averageRating?: number;
  reviewCount?: number;
  categories?: string[];
  tags?: string[];
  homepage?: string;
  repository?: string;
  files?: {
    icon?: string;
    readme?: string;
    changelog?: string;
    license?: string;
    download?: string;
  };
}

export default function ExtensionDetailEditor({ content }: ExtensionDetailEditorProps) {
  const initialItem = useMemo(() => parseExtension(content), [content]);
  const { installed, installExtensionFromInternet, uninstallExtension } = useExtensionStore();
  const addNotification = useUIStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [remoteDetails, setRemoteDetails] = useState<RemoteExtensionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const item = remoteDetails?.item || initialItem;
  const isInstalled = installed.some((extension) => extension.id === item.id);
  const isActive = isInstalled && getActiveExtensionIds().has(item.id);
  const hasTheme = Boolean(getThemeForExtension(item.id));
  const capabilities = useMemo(() => {
    const remoteCategories = remoteDetails?.categories || [];
    return uniqueList([...remoteCategories, ...getExtensionCapabilities(item)]);
  }, [item, remoteDetails]);

  useEffect(() => {
    let disposed = false;

    const loadRemoteDetails = async () => {
      setLoadingDetails(true);
      setDetailsError(null);

      try {
        const details = await fetchOpenVsxDetails(initialItem);
        if (!disposed) setRemoteDetails(details);
      } catch {
        if (!disposed) {
          setRemoteDetails(null);
          setDetailsError('Could not load full marketplace details right now.');
        }
      } finally {
        if (!disposed) setLoadingDetails(false);
      }
    };

    void loadRemoteDetails();
    return () => {
      disposed = true;
    };
  }, [initialItem]);

  const requestInstall = () => {
    if (!isPublisherTrusted(item)) {
      setTrustDialogOpen(true);
      return;
    }
    void handleInstall();
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const installedItem = await installExtensionFromInternet(item);
      setTrustDialogOpen(false);
      addNotification({
        type: 'success',
        message: `Installed ${installedItem.displayName} from ${installedItem.source || 'internet'} and activated it in AI Web IDE`,
      });
    } catch {
      addNotification({ type: 'error', message: `Without internet, ${item.displayName} cannot be installed. Check the connection and try again.` });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = () => {
    uninstallExtension(item.id);
    setSettingsOpen(false);
    addNotification({ type: 'success', message: `Uninstalled ${item.displayName}` });
  };

  const handleDisable = () => {
    setSettingsOpen(false);
    addNotification({ type: 'info', message: `${item.displayName} disabled for this workspace` });
  };

  return (
    <div className="h-full overflow-auto" style={{ background: '#101112', color: 'var(--color-text)' }}>
      <div className="mx-auto flex max-w-[1200px] gap-8 px-8 py-8">
        <main className="min-w-0 flex-1">
          <section className="flex gap-8">
            <ExtensionIcon item={item} size="large" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[40px] font-semibold leading-tight">{item.displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[20px]" style={{ color: '#d2d2d2' }}>
                <span className="flex items-center gap-1">
                  {item.verified && <BadgeCheck size={22} fill="#44b9e8" color="#44b9e8" />}
                  <span style={{ color: '#38aadd' }}>{item.publisher}</span>
                </span>
                <span className="h-5 w-px bg-white/20" />
                <span className="flex items-center gap-1">
                  <DownloadCloud size={22} />
                  {formatDownloads(item.downloads)}
                </span>
                <span className="h-5 w-px bg-white/20" />
                <span className="flex items-center gap-1">
                  <RatingStars rating={item.rating} />
                  <span>({formatRating(item.rating)})</span>
                </span>
              </div>
              <p className="mt-5 text-[20px] leading-relaxed" style={{ color: '#dedede' }}>
                {item.description}
              </p>

              <div className="relative mt-5 flex flex-wrap items-center gap-3">
                {isInstalled ? (
                  <>
                    <span className="inline-flex h-[34px] items-center gap-2 rounded px-3 text-[16px] font-medium" style={{ background: '#173f2b', color: '#8ee6ad' }}>
                      <Check size={18} />
                      {isActive ? 'Active' : 'Installed'}
                    </span>
                    {hasTheme && (
                      <button
                        className="inline-flex h-[34px] items-center gap-2 rounded px-3 text-[16px] font-medium hover:brightness-110"
                        style={{ background: '#2a1d4a', color: '#c8a0ff' }}
                        onClick={() => {
                          const theme = getThemeForExtension(item.id);
                          if (theme) {
                            applyTheme(theme);
                            addNotification({ type: 'success', message: `Applied ${theme.name} theme` });
                          }
                        }}
                      >
                        <Palette size={16} />
                        Apply Theme
                      </button>
                    )}
                    <button className="h-[34px] rounded px-3 text-[16px] font-medium hover:brightness-110" style={primaryButtonStyle} onClick={handleUninstall}>
                      Uninstall
                    </button>
                  </>
                ) : (
                  <button className="h-[34px] rounded px-3 text-[16px] font-medium hover:brightness-110 disabled:opacity-70" style={primaryButtonStyle} disabled={installing} onClick={requestInstall}>
                    {installing ? 'Installing...' : 'Install'}
                  </button>
                )}
                <label className="flex h-[34px] items-center gap-2 text-[17px]" style={{ color: '#d8d8d8' }}>
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded border" style={{ borderColor: '#6a6a6a', background: autoUpdate ? '#252526' : 'transparent' }}>
                    {autoUpdate && <Check size={18} />}
                  </span>
                  <input className="sr-only" type="checkbox" checked={autoUpdate} onChange={(event) => setAutoUpdate(event.target.checked)} />
                  Auto Update
                </label>
                <button
                  className="flex h-[34px] w-[34px] items-center justify-center rounded hover:bg-white/10"
                  title="Manage Extension"
                  style={{ color: 'var(--color-textMuted)' }}
                  onClick={() => setSettingsOpen((value) => !value)}
                >
                  <Settings size={22} />
                </button>
                {settingsOpen && (
                  <div className="absolute left-[210px] top-10 z-20 w-[190px] rounded border py-1 shadow-xl" style={{ background: '#252526', borderColor: 'var(--color-border)' }}>
                    <button className="w-full px-3 py-1.5 text-left text-[14px] hover:bg-white/10" onClick={handleDisable}>Disable</button>
                    <button className="w-full px-3 py-1.5 text-left text-[14px] hover:bg-white/10" onClick={() => addNotification({ type: 'info', message: `${item.displayName} settings opened` })}>Extension Settings</button>
                    <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] hover:bg-white/10" onClick={handleUninstall}>
                      <Trash2 size={15} />
                      Uninstall
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-[17px]" style={{ color: '#d6d6d6' }}>
                {loadingDetails ? <Loader2 size={20} className="animate-spin" color="#38aadd" /> : <Star size={20} color="#38aadd" />}
                <span>
                  {loadingDetails
                    ? 'Loading full marketplace details...'
                    : detailsError || `Details loaded from ${remoteDetails?.source || 'local marketplace data'}. Installed extensions stay inside AI Web IDE.`}
                </span>
              </div>
            </div>
          </section>

          <nav className="mt-10 flex border-b" style={{ borderColor: 'var(--color-border)' }}>
            {(['details', 'features', 'runtime', 'changelog'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                className="h-[42px] px-4 text-[16px] uppercase"
                style={{
                  color: activeTab === tab ? '#ffffff' : 'var(--color-textMuted)',
                  borderBottom: activeTab === tab ? '2px solid #3a9dcc' : '2px solid transparent',
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="min-h-[430px] py-8">
            {activeTab === 'details' && <DetailsContent item={item} capabilities={capabilities} readme={remoteDetails?.readme} />}
            {activeTab === 'features' && <FeaturesContent item={item} capabilities={capabilities} readme={remoteDetails?.readme} />}
            {activeTab === 'runtime' && <RuntimeContent item={item} capabilities={capabilities} isInstalled={isInstalled} />}
            {activeTab === 'changelog' && <ChangelogContent item={item} changelog={remoteDetails?.changelog} />}
          </section>
        </main>

        <aside className="hidden w-[246px] flex-shrink-0 pt-[330px] lg:block">
          <InfoPanel title="Marketplace">
            <InfoRow label="Identifier" value={item.id} mono />
            <InfoRow label="Version" value={item.version} />
            <InfoRow label="Publisher" value={item.publisher} />
            <InfoRow label="Source" value={remoteDetails?.source || 'Local'} />
            <InfoRow label="Installed" value={isInstalled ? 'Yes' : 'No'} />
          </InfoPanel>

          <InfoPanel title="Categories">
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability) => (
                <span key={capability} className="rounded border px-2 py-1 text-[14px]" style={{ borderColor: '#3a3a3a', color: '#d8d8d8' }}>
                  {capability}
                </span>
              ))}
            </div>
          </InfoPanel>

          <InfoPanel title="Resources">
            <button className="flex items-center gap-2 text-[16px]" style={{ color: '#38aadd' }} onClick={() => addNotification({ type: 'info', message: 'Resource links stay inside this platform preview' })}>
              <ShieldCheck size={18} />
              Platform Managed
            </button>
          </InfoPanel>
        </aside>
      </div>

      {trustDialogOpen && (
        <PublisherTrustDialog
          item={item}
          installing={installing}
          onTrust={() => {
            trustPublisher(item);
            void handleInstall();
          }}
          onLearnMore={() => addNotification({ type: 'info', message: 'Install extensions only from publishers you trust. Extensions are activated inside this platform after installation.' })}
          onCancel={() => setTrustDialogOpen(false)}
        />
      )}
    </div>
  );
}

function DetailsContent({ item, capabilities, readme }: { item: ExtensionItem; capabilities: string[]; readme?: string }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <ExtensionIcon item={item} size="hero" />
        <h2 className="mt-8 text-[40px] font-light" style={{ color: '#cfcfcf' }}>{item.displayName}</h2>
        <p className="mt-4 max-w-[720px] text-[20px] leading-relaxed" style={{ color: '#a8a8a8' }}>{item.description}</p>
      </div>
      <div className="mt-8 grid w-full max-w-[780px] grid-cols-1 gap-3 sm:grid-cols-2">
        {capabilities.map((capability) => (
          <div key={capability} className="rounded border p-4 text-left" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
            <div className="text-[18px] font-semibold">{capability}</div>
            <div className="mt-1 text-[14px]" style={{ color: '#a8a8a8' }}>
              Available after installation in this IDE workspace.
            </div>
          </div>
        ))}
      </div>
      {readme && (
        <div className="mt-10 border-t pt-8 text-left" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="mb-5 text-[26px] font-normal">README</h2>
          <MarkdownText text={readme} />
        </div>
      )}
    </div>
  );
}

function FeaturesContent({ item, capabilities, readme }: { item: ExtensionItem; capabilities: string[]; readme?: string }) {
  const featureText = extractMarkdownSection(readme, ['features', 'feature highlights', 'functionality']);

  return (
    <div className="max-w-[760px] text-[18px] leading-relaxed" style={{ color: '#d8d8d8' }}>
      <h2 className="mb-5 text-[26px] font-normal">Features</h2>
      {featureText ? (
        <div className="mb-6 rounded border p-4" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <MarkdownText text={featureText} />
        </div>
      ) : (
        <p className="mb-6" style={{ color: '#a8a8a8' }}>
          Marketplace feature text was not published separately for {item.displayName}. The detected extension capabilities are shown below.
        </p>
      )}
      {capabilities.map((capability) => (
        <div key={capability} className="mb-4 rounded border p-4" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <div className="font-semibold">{capability}</div>
          <div className="mt-1" style={{ color: '#a8a8a8' }}>
            This capability is registered with the AI Web IDE extension runtime when installed.
          </div>
        </div>
      ))}
    </div>
  );
}

function RuntimeContent({ item, capabilities, isInstalled }: { item: ExtensionItem; capabilities: string[]; isInstalled: boolean }) {
  const activationEvents = inferActivationEvents(item, capabilities);
  const manifestRows = [
    ['Name', item.name],
    ['Version', item.version],
    ['Publisher', item.publisher],
    ['Entry', './extension.js'],
    ['Activation', activationEvents.join(', ')],
  ];

  return (
    <div className="max-w-[920px] text-[17px] leading-relaxed" style={{ color: '#d8d8d8' }}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-[620px]">
          <h2 className="text-[26px] font-normal">Extension Runtime</h2>
          <p className="mt-3" style={{ color: '#a8a8a8' }}>
            AI Web IDE treats extensions as plug-ins that add capabilities without changing the editor core. They are installed, registered from a manifest, activated by events, and then connected to the editor through platform APIs.
          </p>
        </div>
        <span
          className="inline-flex h-[34px] items-center gap-2 rounded px-3 text-[15px] font-medium"
          style={{ background: isInstalled ? '#173f2b' : '#252526', color: isInstalled ? '#8ee6ad' : '#cfcfcf' }}
        >
          <Power size={17} />
          {isInstalled ? 'Installed and ready' : 'Installs on demand'}
        </span>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RuntimeMetric icon={<DownloadCloud size={20} />} label="Installation" value={item.source || 'Marketplace'} />
        <RuntimeMetric icon={<FileJson size={20} />} label="Manifest" value="package.json" />
        <RuntimeMetric icon={<Play size={20} />} label="Activation" value={activationEvents[0]} />
        <RuntimeMetric icon={<ShieldCheck size={20} />} label="Execution" value="Extension Host" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded border p-5" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <h3 className="mb-5 text-[22px] font-normal">Complete Workflow</h3>
          <div className="grid gap-3">
            {extensionLifecycleSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[34px_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded" style={{ background: '#203844', color: '#7fd7ff' }}>
                    {step.icon}
                  </div>
                  {index < extensionLifecycleSteps.length - 1 && <div className="my-1 h-full min-h-[18px] w-px bg-white/15" />}
                </div>
                <div className="pb-3">
                  <div className="text-[18px] font-semibold">{step.title}</div>
                  <div className="mt-1 text-[15px]" style={{ color: '#a8a8a8' }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border p-5" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <h3 className="mb-4 text-[22px] font-normal">Manifest Preview</h3>
          <div className="space-y-3">
            {manifestRows.map(([label, value]) => (
              <div key={label}>
                <div className="text-[13px] uppercase" style={{ color: '#858585' }}>{label}</div>
                <div className="mt-1 break-words font-mono text-[14px]" style={{ color: '#dcdcdc' }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded border p-5" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
        <h3 className="mb-4 text-[22px] font-normal">Extension Host Model</h3>
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_54px_1fr_54px_1fr]">
        <RuntimeBox title="IDE UI" subtitle="Editor, panels, menus" icon={<PanelLeft size={23} />} />
          <FlowArrow />
          <RuntimeBox title="Extension Host" subtitle="Runs extension code separately" icon={<ShieldCheck size={23} />} />
          <FlowArrow />
          <RuntimeBox title="Extension Code" subtitle="activate(), commands, providers" icon={<PlugZap size={23} />} />
        </div>
      </section>

      <section className="mt-4 rounded border p-5" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
        <h3 className="mb-3 text-[22px] font-normal">Registered Features</h3>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((capability) => (
            <span key={capability} className="rounded border px-3 py-1.5 text-[15px]" style={{ borderColor: '#3a3a3a', color: '#d8d8d8' }}>
              {capability}
            </span>
          ))}
        </div>
        <pre className="mt-4 overflow-auto rounded px-3 py-2 font-mono text-[13px]" style={{ background: '#0b0d0e', color: '#cfcfcf' }}>
          registerCommand("{item.name}.hello", callback);
        </pre>
      </section>
    </div>
  );
}

function ChangelogContent({ item, changelog }: { item: ExtensionItem; changelog?: string }) {
  return (
    <div className="max-w-[760px] text-[18px] leading-relaxed" style={{ color: '#d8d8d8' }}>
      <h2 className="mb-5 text-[26px] font-normal">Changelog</h2>
      {changelog ? (
        <div className="rounded border p-4" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <MarkdownText text={changelog} />
        </div>
      ) : (
        <div className="rounded border p-4" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
          <div className="font-semibold">Version {item.version}</div>
          <div className="mt-1" style={{ color: '#a8a8a8' }}>
            This extension does not expose a separate changelog file through the marketplace metadata.
          </div>
        </div>
      )}
    </div>
  );
}

function RuntimeMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border p-4" style={{ borderColor: 'var(--color-border)', background: '#151718' }}>
      <div className="flex items-center gap-2 text-[14px] uppercase" style={{ color: '#858585' }}>
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-[18px] font-semibold" style={{ color: '#eeeeee' }}>{value}</div>
    </div>
  );
}

function RuntimeBox({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded border p-4 text-center" style={{ borderColor: '#32363a', background: '#101112' }}>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded" style={{ background: '#203844', color: '#7fd7ff' }}>{icon}</div>
      <div className="mt-3 text-[18px] font-semibold">{title}</div>
      <div className="mt-1 text-[14px]" style={{ color: '#a8a8a8' }}>{subtitle}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center md:flex" style={{ color: '#7fd7ff' }}>
      <GitBranch size={25} />
    </div>
  );
}

const extensionLifecycleSteps = [
  {
    title: 'Install Extension',
    description: 'The package is installed from the marketplace or a local source and stored for this browser workspace.',
    icon: <DownloadCloud size={18} />,
  },
  {
    title: 'Read Manifest',
    description: 'The IDE reads metadata such as name, version, commands, activation events, and the extension entry file.',
    icon: <FileJson size={18} />,
  },
  {
    title: 'Register Extension',
    description: 'Commands, languages, menus, debuggers, and panels become known to the workbench before code is loaded.',
    icon: <PlugZap size={18} />,
  },
  {
    title: 'Activation Event Occurs',
    description: 'The extension loads only when a command, language, workspace condition, or startup event needs it.',
    icon: <Play size={18} />,
  },
  {
    title: 'Run activate()',
    description: 'The extension host executes the extension entry point and receives subscriptions for cleanup later.',
    icon: <Power size={18} />,
  },
  {
    title: 'Use IDE APIs',
    description: 'Extension code can open files, show notifications, read settings, and update editor content through controlled APIs.',
    icon: <PanelLeft size={18} />,
  },
  {
    title: 'deactivate() on Shutdown',
    description: 'When disabled or when the IDE closes, listeners, timers, and other resources are released.',
    icon: <ShieldCheck size={18} />,
  },
];

function inferActivationEvents(item: ExtensionItem, capabilities: string[]) {
  const events = new Set<string>();
  const text = `${item.id} ${item.displayName} ${item.description} ${capabilities.join(' ')}`.toLowerCase();

  if (/formatter|linter|language|python|java|typescript|javascript|c\+\+|rust|go|tailwind/.test(text)) {
    events.add('onLanguage');
  }
  if (/debug/.test(text)) events.add('onDebug');
  if (/theme|icon/.test(text)) events.add('onStartupFinished');
  if (/git|github|source control/.test(text)) events.add('workspaceContains:.git');
  events.add(`onCommand:${item.name}.hello`);

  return Array.from(events);
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;

  return (
    <div className="space-y-2 text-[16px] leading-relaxed" style={{ color: '#d6d6d6' }}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
          inCode = !inCode;
          return <div key={index} className="h-1" />;
        }
        if (!trimmed) return <div key={index} className="h-2" />;
        if (inCode) {
          return (
            <pre key={index} className="overflow-auto rounded px-3 py-2 font-mono text-[13px]" style={{ background: '#0b0d0e', color: '#cfcfcf' }}>
              {line}
            </pre>
          );
        }
        if (trimmed.startsWith('#')) {
          const depth = Math.min(trimmed.match(/^#+/)?.[0].length || 1, 3);
          const label = trimmed.replace(/^#+\s*/, '');
          const size = depth === 1 ? 'text-[28px]' : depth === 2 ? 'text-[23px]' : 'text-[19px]';
          return <h3 key={index} className={`${size} pt-3 font-semibold`} style={{ color: '#eeeeee' }}>{label}</h3>;
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return <div key={index} className="pl-4" style={{ color: '#d6d6d6' }}>- {trimmed.replace(/^[-*]\s+/, '')}</div>;
        }
        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
}

function ExtensionIcon({ item, size }: { item: ExtensionItem; size: 'large' | 'hero' }) {
  const className = size === 'hero' ? 'h-[270px] w-[270px]' : 'h-[174px] w-[174px]';
  return (
    <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] ${className}`} style={{ background: item.iconUrl ? 'transparent' : '#2d2d30', color: 'var(--color-textMuted)' }}>
      {item.iconUrl ? <img src={item.iconUrl} alt="" className="h-full w-full object-contain" /> : <Package size={size === 'hero' ? 132 : 84} strokeWidth={1.4} />}
    </div>
  );
}

function RatingStars({ rating = 0 }: { rating?: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="flex items-center">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={22} fill={index < rounded ? '#f89b22' : 'transparent'} color="#f89b22" />
      ))}
    </span>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-5" style={{ borderColor: 'var(--color-border)' }}>
      <h2 className="mb-4 text-[24px] font-normal">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-3 grid grid-cols-[86px_1fr] gap-3 text-[16px]">
      <span style={{ color: '#d8d8d8' }}>{label}</span>
      <span className={mono ? 'font-mono text-[14px]' : ''} style={{ color: '#d8d8d8' }}>{value}</span>
    </div>
  );
}

function parseExtension(content: string): ExtensionItem {
  try {
    const parsed = JSON.parse(content) as ExtensionItem;
    if (parsed?.id && parsed?.displayName) return parsed;
  } catch {
    // Fall through to a neutral extension shell.
  }

  return {
    id: 'unknown.extension',
    name: 'extension',
    displayName: 'Extension',
    publisher: 'Unknown',
    version: 'latest',
    description: 'Extension details are unavailable.',
  };
}

async function fetchOpenVsxDetails(baseItem: ExtensionItem): Promise<RemoteExtensionDetails> {
  const [namespace, ...nameParts] = baseItem.id.split('.');
  const name = nameParts.join('.');
  if (!namespace || !name) throw new Error('Invalid extension id');

  const response = await fetch(`https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Open VSX returned ${response.status}`);

  const data = await response.json() as OpenVsxDetail;
  const item = fromOpenVsxDetail(baseItem, data, namespace, name);
  const readmeUrl = normalizeRemoteUrl(data.files?.readme);
  const changelogUrl = normalizeRemoteUrl(data.files?.changelog);
  const [readme, changelog] = await Promise.all([
    readmeUrl ? fetchText(readmeUrl) : Promise.resolve(undefined),
    changelogUrl ? fetchText(changelogUrl) : Promise.resolve(undefined),
  ]);

  return {
    item,
    readme,
    changelog,
    categories: uniqueList([...(data.categories || []), ...(data.tags || [])]),
    source: 'Open VSX',
  };
}

function fromOpenVsxDetail(baseItem: ExtensionItem, data: OpenVsxDetail, namespace: string, name: string): ExtensionItem {
  return {
    ...baseItem,
    id: `${data.namespace || namespace}.${data.name || name}`,
    name: data.name || name,
    displayName: data.displayName || baseItem.displayName,
    publisher: data.namespace || baseItem.publisher,
    version: data.version || baseItem.version,
    description: data.description || baseItem.description,
    downloads: data.downloadCount ?? baseItem.downloads,
    rating: data.averageRating ?? baseItem.rating,
    iconUrl: normalizeRemoteUrl(data.files?.icon) || baseItem.iconUrl,
    homepage: data.homepage || data.repository || baseItem.homepage,
    verified: true,
  };
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await response.text();
  } catch {
    return undefined;
  }
}

function normalizeRemoteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://open-vsx.org${url.startsWith('/') ? '' : '/'}${url}`;
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractMarkdownSection(text: string | undefined, headings: string[]) {
  if (!text) return undefined;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const startIndex = lines.findIndex((line) => {
    const normalized = line.replace(/^#+\s*/, '').trim().toLowerCase();
    return headings.includes(normalized);
  });
  if (startIndex === -1) return undefined;

  const currentLevel = lines[startIndex].match(/^#+/)?.[0].length || 1;
  const endIndex = lines.findIndex((line, index) => {
    if (index <= startIndex) return false;
    const level = line.match(/^#+/)?.[0].length;
    return Boolean(level && level <= currentLevel);
  });

  return lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex).join('\n').trim();
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

const primaryButtonStyle = {
  background: '#2f86ad',
  color: '#ffffff',
};
