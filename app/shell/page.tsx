'use client';

import { useEffect, useState, useRef } from 'react';
import { generateShellUrl } from '@/lib/utils/shell';
import { injectCSSDirectly, injectCSSViaPostMessage } from '@/lib/utils/css-injector';

export default function ShellPage() {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Auto-load shell without authentication
    setLoading(false);
  }, []);

  useEffect(() => {
    // Inject CSS into iframe after it loads
    const injectCSS = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Try direct injection first
      if (!injectCSSDirectly(iframe)) {
        // Fallback to postMessage
        injectCSSViaPostMessage(iframe);
      }

      // Retry injection periodically in case iframe loads slowly
      const retryInterval = setInterval(() => {
        if (injectCSSDirectly(iframe)) {
          clearInterval(retryInterval);
        }
      }, 2000);

      // Stop retrying after 10 seconds
      setTimeout(() => clearInterval(retryInterval), 10000);
    };

    // Try to inject CSS when iframe loads
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        setTimeout(injectCSS, 1000);
      };
      // Also try immediately if already loaded
      if (iframe.contentDocument) {
        injectCSS();
      }
    }
  }, []);

  // Direct Cloud Shell URL - we'll trick it into thinking it's authenticated
  const shellUrl = generateShellUrl({ showIde: true, showTerminal: true });

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-500/50 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">SCG</h1>
          <span className="text-sm text-purple-200 italic">powered by magic ✨</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-white/80">Connected</span>
        </div>
      </header>

      {/* Shell Container with custom styling */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-indigo-900/20">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">✨</div>
              <p className="text-white/90">Initializing cloud shell...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={shellUrl}
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
          title="SCG Cloud Shell"
          style={{ 
            minHeight: 'calc(100vh - 60px)',
            background: 'transparent'
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* Inject global styles via shadow DOM approach */}
      <style jsx global>{`
        iframe {
          filter: brightness(1.05) contrast(1.02);
        }
      `}</style>
    </div>
  );
}
