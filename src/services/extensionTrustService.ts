import { ExtensionItem } from '../store/extensionStore';

const TRUSTED_PUBLISHERS_KEY = 'ai-web-ide.trustedExtensionPublishers.v1';

export function isPublisherTrusted(item: ExtensionItem) {
  return getTrustedPublishers().includes(normalizePublisher(item.publisher));
}

export function trustPublisher(item: ExtensionItem) {
  const publisher = normalizePublisher(item.publisher);
  const trusted = getTrustedPublishers();
  if (trusted.includes(publisher)) return;
  localStorage.setItem(TRUSTED_PUBLISHERS_KEY, JSON.stringify([...trusted, publisher]));
}

function getTrustedPublishers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRUSTED_PUBLISHERS_KEY) || '[]') as string[];
    return Array.isArray(parsed) ? parsed.map(normalizePublisher).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizePublisher(publisher: string) {
  return publisher.trim().toLowerCase();
}
