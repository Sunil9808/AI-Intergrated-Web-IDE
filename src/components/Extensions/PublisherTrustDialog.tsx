import { AlertTriangle, BadgeCheck, ExternalLink, X } from 'lucide-react';
import { ExtensionItem } from '../../store/extensionStore';

interface PublisherTrustDialogProps {
  item: ExtensionItem;
  installing?: boolean;
  onTrust: () => void;
  onCancel: () => void;
  onLearnMore: () => void;
}

export default function PublisherTrustDialog({
  item,
  installing = false,
  onTrust,
  onCancel,
  onLearnMore,
}: PublisherTrustDialogProps) {
  const publisherHost = getPublisherHost(item);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
      <div
        className="w-full max-w-[720px] rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#1f2022', borderColor: '#303235', color: '#d4d4d4' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publisher-trust-title"
      >
        <div className="flex items-start gap-5">
          <AlertTriangle className="mt-1 flex-shrink-0" size={34} color="#f1c40f" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h2 id="publisher-trust-title" className="text-[21px] font-semibold leading-snug">
                Do you trust the publisher "{item.publisher}"?
              </h2>
              <button className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded hover:bg-white/10" onClick={onCancel} title="Cancel">
                <X size={22} />
              </button>
            </div>

            <p className="mt-7 text-[20px] leading-relaxed" style={{ color: '#c8c8c8' }}>
              The extension <span style={{ color: '#36aee2' }}>{item.displayName}</span> is published by{' '}
              <span style={{ color: '#36aee2' }}>{item.publisher}</span>. This is the first extension you're installing from this publisher.
            </p>

            <p className="mt-5 flex items-center gap-2 text-[19px]" style={{ color: '#c8c8c8' }}>
              <BadgeCheck size={24} fill="#44b9e8" color="#44b9e8" />
              <span>
                <span style={{ color: '#36aee2' }}>{item.publisher}</span> has verified ownership of{' '}
                <span className="inline-flex items-center gap-1" style={{ color: '#36aee2' }}>
                  {publisherHost}
                  <ExternalLink size={18} />
                </span>
              </span>
            </p>

            <p className="mt-5 text-[20px] leading-relaxed" style={{ color: '#c8c8c8' }}>
              Extensions work as plug-in modules that integrate with AI Web IDE through a defined Extension API. The IDE detects
              installed extensions, reads their metadata, and activates them only when a trigger occurs, such as opening a supported
              file type or running a command.
            </p>

            <p className="mt-5 text-[20px] leading-relaxed" style={{ color: '#c8c8c8' }}>
              When activated, an extension runs in a separate extension host process and communicates with the IDE through APIs to
              add features like syntax highlighting, code completion, debugging, Git integration, AI assistance, or custom menus.
              Extensions send requests to the IDE instead of directly modifying its core code.
            </p>

            <p className="mt-5 text-[20px] leading-relaxed" style={{ color: '#c8c8c8' }}>
              AI Web IDE has no control over the behavior of third-party extensions, including how they manage your data.
              Without internet, extensions cannot be downloaded or updated from the marketplace.
            </p>

            <div className="mt-14 flex justify-end gap-3">
              <button
                className="h-[38px] rounded-md px-4 text-[17px] font-medium hover:brightness-110 disabled:opacity-70"
                style={{ background: '#2f86ad', color: '#ffffff' }}
                disabled={installing}
                onClick={onTrust}
              >
                {installing ? 'Installing...' : 'Trust Publisher & Install'}
              </button>
              <button className="h-[38px] rounded-md px-4 text-[17px] hover:bg-white/10" style={{ background: '#303133', color: '#d4d4d4' }} onClick={onLearnMore}>
                Learn More
              </button>
              <button className="h-[38px] rounded-md border px-4 text-[17px] hover:bg-white/10" style={{ borderColor: '#3b3d40', color: '#d4d4d4' }} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPublisherHost(item: ExtensionItem) {
  if (!item.homepage) return `${item.publisher}.publisher`;

  try {
    return new URL(item.homepage).hostname;
  } catch {
    return item.publisher;
  }
}
