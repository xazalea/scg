/**
 * Service Worker to intercept all network requests
 * and inject fake authentication
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept all Google Cloud Shell requests
  if (url.hostname.includes('cloud.google.com') || 
      url.hostname.includes('shell.cloud.google.com') ||
      url.hostname.includes('accounts.google.com')) {
    
    event.respondWith(
      fetch(event.request, {
        headers: {
          ...Object.fromEntries(event.request.headers.entries()),
          'Authorization': 'Bearer ya29.fake-token-verified',
          'X-Goog-AuthUser': '0',
          'X-Goog-Cloud-Shell-Auth': 'verified',
          'X-Goog-Api-Key': 'AIzaSyFakeKeyForCloudShell',
          'Referer': 'https://console.cloud.google.com/',
          'Origin': 'https://console.cloud.google.com',
        },
        credentials: 'include',
      }).then(response => {
        // If it's HTML, inject authentication script
        if (response.headers.get('content-type')?.includes('text/html')) {
          return response.text().then(html => {
            const authScript = `
              <script>
                (function() {
                  // Set fake auth everywhere
                  localStorage.setItem('oauth_token', 'ya29.fake-token-verified');
                  localStorage.setItem('cloud_shell_auth', 'verified');
                  sessionStorage.setItem('auth_verified', 'true');
                  
                  // Override fetch
                  const originalFetch = window.fetch;
                  window.fetch = function(...args) {
                    if (args[1]) {
                      args[1].headers = args[1].headers || {};
                      args[1].headers['Authorization'] = 'Bearer ya29.fake-token-verified';
                      args[1].headers['X-Goog-AuthUser'] = '0';
                      args[1].headers['X-Goog-Cloud-Shell-Auth'] = 'verified';
                    }
                    return originalFetch.apply(this, args);
                  };
                  
                  // Override XMLHttpRequest
                  const originalOpen = XMLHttpRequest.prototype.open;
                  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
                  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    this._url = url;
                    return originalOpen.apply(this, [method, url, ...rest]);
                  };
                  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
                    if (name.toLowerCase() === 'authorization') {
                      value = 'Bearer ya29.fake-token-verified';
                    }
                    return originalSetRequestHeader.apply(this, [name, value]);
                  };
                  
                  // Auto-inject auth headers on send
                  const originalSend = XMLHttpRequest.prototype.send;
                  XMLHttpRequest.prototype.send = function(...args) {
                    this.setRequestHeader('Authorization', 'Bearer ya29.fake-token-verified');
                    this.setRequestHeader('X-Goog-AuthUser', '0');
                    this.setRequestHeader('X-Goog-Cloud-Shell-Auth', 'verified');
                    return originalSend.apply(this, args);
                  };
                })();
              </script>
            `;
            
            const modifiedHtml = html.replace('</head>', authScript + '</head>') || 
                                 html.replace('<body', authScript + '<body');
            
            return new Response(modifiedHtml, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          });
        }
        return response;
      })
    );
  }
});

