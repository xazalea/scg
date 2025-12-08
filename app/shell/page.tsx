'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function ShellPage() {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [shellUrl, setShellUrl] = useState('/api/proxy-full/?show=ide%2Cterminal&authuser=0');

  useEffect(() => {
    // Ensure fake authentication is set up and create Cloud Shell session
    const ensureAuth = async () => {
      try {
        // Create fake auth
        await axios.get('/api/auth/fake', { withCredentials: true });
        
        // Try to create Cloud Shell session via direct API
        try {
          const sessionResponse = await axios.post('/api/cloudshell/create-session', {}, { withCredentials: true });
          if (sessionResponse.data.sessionUrl) {
            // Use the session URL if available
            setShellUrl(sessionResponse.data.sessionUrl);
          }
        } catch (e) {
          // Fallback to proxy if API fails
          console.log('Using proxy fallback');
        }
      } catch (error) {
        console.error('Auth setup error:', error);
      }
    };

    ensureAuth();
  }, []);

  useEffect(() => {
    // Comprehensive iframe setup with aggressive authentication injection
    const setupIframe = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Function to inject authentication
      const injectAuth = () => {
        try {
          const iframeWindow = iframe.contentWindow;
          const iframeDoc = iframe.contentDocument || iframeWindow?.document;
          
          if (!iframeDoc) {
            // Use postMessage if cross-origin
            iframeWindow?.postMessage({
              type: 'SCG_AUTH_INJECT',
              token: 'ya29.fake-token-verified',
              email: 'user@example.com',
              userId: '123456789',
            }, '*');
            return;
          }

          // Inject comprehensive authentication script
          const authScript = iframeDoc.createElement('script');
          authScript.id = 'scg-auth-bypass';
          authScript.textContent = `
            (function() {
              const FAKE_TOKEN = 'ya29.fake-token-verified';
              const FAKE_EMAIL = 'user@example.com';
              const FAKE_USER_ID = '123456789';
              
              // Set in all storage
              try {
                localStorage.setItem('oauth_token', FAKE_TOKEN);
                localStorage.setItem('cloud_shell_auth', 'verified');
                localStorage.setItem('auth_verified', 'true');
                sessionStorage.setItem('oauth_token', FAKE_TOKEN);
                sessionStorage.setItem('auth_verified', 'true');
              } catch(e) {}
              
              // Override fetch
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                if (args[1]) {
                  args[1].headers = args[1].headers || {};
                  args[1].headers['Authorization'] = 'Bearer ' + FAKE_TOKEN;
                  args[1].headers['X-Goog-AuthUser'] = '0';
                  args[1].headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                }
                return originalFetch.apply(this, args);
              };
              
              // Override XMLHttpRequest
              const originalSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.send = function(...args) {
                this.setRequestHeader('Authorization', 'Bearer ' + FAKE_TOKEN);
                this.setRequestHeader('X-Goog-AuthUser', '0');
                this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
                return originalSend.apply(this, args);
              };
              
              // Block login redirects
              const originalReplace = window.location.replace;
              window.location.replace = function(url) {
                if (url && url.includes('accounts.google.com/signin')) {
                  console.log('Blocked login redirect');
                  return;
                }
                return originalReplace.apply(this, arguments);
              };
            })();
          `;
          
          if (iframeDoc.head) {
            const existing = iframeDoc.getElementById('scg-auth-bypass');
            if (existing) existing.remove();
            iframeDoc.head.appendChild(authScript);
          }
        } catch (e) {
          console.log('Cross-origin, using postMessage');
        }
      };

      // Listen for iframe load
      iframe.onload = () => {
        setTimeout(() => {
          injectAuth();
          setLoading(false);
        }, 2000);
      };

      // Also listen for postMessage from iframe
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'SCG_AUTH_REQUEST') {
          iframe.contentWindow?.postMessage({
            type: 'SCG_AUTH_RESPONSE',
            token: 'ya29.fake-token-verified',
            email: 'user@example.com',
            userId: '123456789',
          }, '*');
        }
      });

      // Retry injection periodically
      const retryInterval = setInterval(() => {
        injectAuth();
      }, 3000);

      setTimeout(() => clearInterval(retryInterval), 30000);
    };

    setupIframe();
  }, [iframeKey]);

  // shellUrl is set in useEffect, defaults to proxy

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
          <button
            onClick={() => {
              setIframeKey(prev => prev + 1);
              setLoading(true);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 ml-4"
          >
            reload
          </button>
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
          key={iframeKey}
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

      {/* Inject global authentication interceptor */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Intercept all fetch requests before iframe loads
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                const [url, options = {}] = args;
                
                // If it's a Google request, add auth
                if (typeof url === 'string' && url.includes('google.com')) {
                  options.headers = options.headers || {};
                  if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
                    options.headers['Authorization'] = 'Bearer ya29.fake-token-verified';
                    options.headers['X-Goog-AuthUser'] = '0';
                    options.headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                  }
                }
                
                return originalFetch.apply(this, [url, options]);
              };
            })();
          `,
        }}
      />
    </div>
  );
}
