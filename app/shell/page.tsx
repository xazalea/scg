'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { injectCSSDirectly, CLOUD_SHELL_CSS } from '@/lib/utils/css-injector';

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
    // Register service worker for request interception
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    // Comprehensive iframe setup with authentication bypass
    const setupIframe = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const injectComprehensiveBypass = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            // Cross-origin - use postMessage
            iframe.contentWindow?.postMessage({
              type: 'inject-auth',
              token: 'ya29.fake-token-verified',
            }, '*');
            return;
          }

          // Inject comprehensive bypass script
          const bypassScript = iframeDoc.createElement('script');
          bypassScript.textContent = `
            (function() {
              const fakeToken = 'ya29.fake-token-verified';
              
              // Set in all storage
              try {
                localStorage.setItem('oauth_token', fakeToken);
                localStorage.setItem('cloud_shell_auth', 'verified');
                localStorage.setItem('auth_user', '0');
                sessionStorage.setItem('oauth_token', fakeToken);
                sessionStorage.setItem('auth_verified', 'true');
              } catch(e) {}
              
              // Override fetch
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                const [url, options = {}] = args;
                options.headers = options.headers || {};
                if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
                  options.headers['Authorization'] = 'Bearer ' + fakeToken;
                  options.headers['X-Goog-AuthUser'] = '0';
                  options.headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                }
                return originalFetch.apply(this, [url, options]);
              };
              
              // Override XMLHttpRequest
              const originalSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.send = function(...args) {
                this.setRequestHeader('Authorization', 'Bearer ' + fakeToken);
                this.setRequestHeader('X-Goog-AuthUser', '0');
                this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
                return originalSend.apply(this, args);
              };
              
              // Set cookies
              document.cookie = 'oauth_token=' + fakeToken + '; path=/; domain=.google.com';
              document.cookie = 'SID=fake-sid; path=/; domain=.google.com';
              
              // Block login redirects
              const originalLocation = window.location;
              let loginBlocked = false;
              Object.defineProperty(window, 'location', {
                get: () => originalLocation,
                set: (url) => {
                  if (url.includes('signin') || url.includes('ServiceLogin')) {
                    if (!loginBlocked) {
                      loginBlocked = true;
                      console.log('Blocked login redirect');
                      setTimeout(() => { loginBlocked = false; }, 1000);
                    }
                    return;
                  }
                  originalLocation.href = url;
                }
              });
            })();
          `;
          
          if (iframeDoc.head) {
            iframeDoc.head.appendChild(bypassScript);
          }

          // Inject CSS
          injectCSSDirectly(iframe);
        } catch (e) {
          console.log('Cross-origin restrictions');
        }
      };

      iframe.onload = () => {
        setTimeout(() => {
          injectComprehensiveBypass();
          setLoading(false);
        }, 2000);
      };

      // Retry injection
      const retryInterval = setInterval(() => {
        injectComprehensiveBypass();
      }, 1000);

      setTimeout(() => clearInterval(retryInterval), 15000);
    };

    setupIframe();
  }, []);

  // Use full proxy that intercepts everything
  const shellUrl = '/api/proxy-full?show=ide%2Cterminal';

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
          allow="clipboard-read; clipboard-write; fullscreen; autoplay"
          title="SCG Cloud Shell"
          style={{ 
            minHeight: 'calc(100vh - 120px)',
            background: 'transparent'
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-presentation"
          onLoad={() => setTimeout(() => setLoading(false), 2000)}
        />
      </div>

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
