import React, { useEffect, useRef } from 'react';

interface HtmlPreviewProps {
  html: string;
  autoUpdate?: boolean;
  debounceMs?: number;
  sandbox?: string;
  onConsoleMessage?: (msg: { level: string; args: any[] }) => void;
}

export default function HtmlPreview({
  html,
  autoUpdate = false,
  debounceMs = 250,
  sandbox = 'allow-scripts allow-forms',
  onConsoleMessage,
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function buildPreviewDoc(sourceHtml: string) {
    const consoleBridge = `
      <script>
        (function () {
          function send(level, args) {
            try { parent.postMessage({ source: 'ai-web-ide-preview', level: level, args: args }, '*'); } catch(e) {}
          }
          const methods = ['log','info','warn','error','debug'];
          methods.forEach(m => {
            const orig = console[m] || function(){};
            console[m] = function() {
              try { send(m, Array.from(arguments)); } catch(e) {}
              try { orig.apply(console, arguments); } catch(e) {}
            };
          });
          window.addEventListener('error', function(e) {
            send('error', [{ message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno }]);
          });
          window.addEventListener('unhandledrejection', function(e) {
            send('error', [{ message: e.reason && e.reason.message ? e.reason.message : String(e.reason) }]);
          });
        })();
      </script>
    `;

    if (/\<head[\s\S]*?>/i.test(sourceHtml)) {
      return sourceHtml.replace(/\<head(.*?)>/i, (m) => m + consoleBridge);
    }
    return consoleBridge + sourceHtml;
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data.source !== 'ai-web-ide-preview') return;
      if (onConsoleMessage) onConsoleMessage({ level: data.level, args: data.args });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onConsoleMessage]);

  useEffect(() => {
    if (!autoUpdate) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (!iframeRef.current) return;
      iframeRef.current.srcdoc = buildPreviewDoc(html);
    }, debounceMs);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [html, autoUpdate, debounceMs]);

  // Expose a simple API via data attribute for manual updates (calling code can set iframeRef.current.srcdoc)
  useEffect(() => {
    if (autoUpdate) return;
    if (!iframeRef.current) return;
    // initial render
    iframeRef.current.srcdoc = buildPreviewDoc(html);
  }, [autoUpdate]);

  useEffect(() => {
    // When html prop changes and autoUpdate is false, don't automatically update — parent calls manual set.
    if (!autoUpdate && iframeRef.current) {
      // no-op
    }
  }, [html, autoUpdate]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <iframe
        ref={iframeRef}
        title="preview"
        style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
        sandbox={sandbox}
      />
    </div>
  );
}
