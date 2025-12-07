'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { generateShellUrl } from '@/lib/utils/shell';
import { injectCSSDirectly, injectCSSViaPostMessage, CLOUD_SHELL_CSS } from '@/lib/utils/css-injector';

export default function ShellPage() {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Ensure fake authentication is set up
    const ensureAuth = async () => {
      try {
        await axios.get('/api/auth/fake', { withCredentials: true });
      } catch (error) {
        console.error('Auth setup error:', error);
      }
    };

    ensureAuth();
  }, []);

  useEffect(() => {
    // Inject CSS and authentication into iframe
    const setupIframe = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const injectAuthAndCSS = () => {
        try {
          // Try direct injection
          if (injectCSSDirectly(iframe)) {
            // Also inject authentication script
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              const script = iframeDoc.createElement('script');
              script.textContent = `
                (function() {
                  // Set fake auth in localStorage
                  localStorage.setItem('cloud_shell_auth', 'verified');
                  localStorage.setItem('oauth_token', 'fake-token-verified');
                  
                  // Override fetch to inject auth
                  const originalFetch = window.fetch;
                  window.fetch = function(...args) {
                    if (args[1]) {
                      args[1].headers = args[1].headers || {};
                      args[1].headers['Authorization'] = 'Bearer fake-token-verified';
                      args[1].headers['X-Goog-AuthUser'] = '0';
                      args[1].headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                    }
                    return originalFetch.apply(this, args);
                  };
                  
                  // Override XMLHttpRequest
                  const originalOpen = XMLHttpRequest.prototype.open;
                  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    this.addEventListener('loadstart', function() {
                      this.setRequestHeader('Authorization', 'Bearer fake-token-verified');
                      this.setRequestHeader('X-Goog-AuthUser', '0');
                      this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
                    });
                    return originalOpen.apply(this, [method, url, ...rest]);
                  };
                })();
              `;
              if (iframeDoc.head) {
                iframeDoc.head.appendChild(script);
              }
            }
          } else {
            // Fallback to postMessage
            injectCSSViaPostMessage(iframe);
          }
        } catch (e) {
          console.log('Cross-origin restrictions, using postMessage');
        }
      };

      // Try injection when iframe loads
      iframe.onload = () => {
        setTimeout(() => {
          injectAuthAndCSS();
          setLoading(false);
        }, 2000);
      };

      // Also try immediately if already loaded
      if (iframe.contentDocument) {
        injectAuthAndCSS();
        setLoading(false);
      }

      // Retry injection periodically
      const retryInterval = setInterval(() => {
        if (injectCSSDirectly(iframe)) {
          clearInterval(retryInterval);
          setLoading(false);
        }
      }, 1000);

      setTimeout(() => clearInterval(retryInterval), 10000);
    };

    setupIframe();
  }, []);

  // Use proxy URL to inject authentication
  const shellUrl = '/api/shell/proxy?url=' + encodeURIComponent(
    generateShellUrl({ showIde: true, showTerminal: true })
  );

  return (
    <div className="min-h-screen flex flex-col monochrome-bg">
      {/* Minimalist header */}
      <header className="monochrome-card m-4 mb-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-light tracking-tight">SCG</h1>
          <span className="text-xs text-gray-500 font-light">cloud shell</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator"></div>
          <span className="text-xs text-gray-600">connected</span>
        </div>
      </header>

      {/* Shell Container */}
      <div className="flex-1 relative m-4 mt-2 monochrome-card overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="status-indicator mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 font-light">Initializing shell...</p>
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
            minHeight: 'calc(100vh - 120px)',
            background: 'transparent'
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
          onLoad={() => setTimeout(() => setLoading(false), 1000)}
        />
      </div>

      {/* Inject global styles */}
      <style jsx global>{`
        iframe {
          filter: contrast(1.02) brightness(0.98);
        }
        body {
          background: #f5f5f5;
        }
      `}</style>
    </div>
  );
}
