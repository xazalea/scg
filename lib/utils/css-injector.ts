/**
 * CSS Injection utilities for Cloud Shell iframe
 */

export const CLOUD_SHELL_CSS = `
  body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
  }
  .cloudshell-container, .cloudshell-main, #cloudshell {
    border-radius: 12px !important;
    box-shadow: 0 0 30px rgba(102, 126, 234, 0.5) !important;
    background: rgba(17, 24, 39, 0.95) !important;
    backdrop-filter: blur(10px) !important;
  }
  .terminal, .editor, .xterm, .xterm-screen, .xterm-viewport {
    background: rgba(17, 24, 39, 0.95) !important;
    border-radius: 8px !important;
  }
  .xterm-viewport {
    background: transparent !important;
  }
  .xterm-cursor-layer {
    background: rgba(102, 126, 234, 0.8) !important;
  }
  /* Hide Google branding */
  .google-logo, [aria-label*="Google"], .gb_logo, .gb_ua, .gb_oa,
  .gb_1a, .gb_2a, .gb_3a, .gb_4a, .gb_5a, .gb_6a, .gb_7a, .gb_8a {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.5);
    border-radius: 5px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(102, 126, 234, 0.7);
  }
  /* Improve terminal colors */
  .xterm .xterm-screen {
    background-color: rgba(17, 24, 39, 0.95) !important;
  }
  /* Add magic glow effect */
  .cloudshell-main::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    z-index: -1;
    opacity: 0.3;
    filter: blur(10px);
  }
`;

/**
 * Inject CSS into iframe using postMessage
 */
export function injectCSSViaPostMessage(iframe: HTMLIFrameElement) {
  if (!iframe.contentWindow) return;

  // Try to inject via postMessage (if iframe allows it)
  iframe.contentWindow.postMessage({
    type: 'inject-css',
    css: CLOUD_SHELL_CSS,
  }, '*');
}

/**
 * Try to inject CSS directly into iframe document
 */
export function injectCSSDirectly(iframe: HTMLIFrameElement): boolean {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return false;

    const style = iframeDoc.createElement('style');
    style.id = 'scg-custom-styles';
    style.textContent = CLOUD_SHELL_CSS;

    if (iframeDoc.head) {
      // Remove existing style if present
      const existing = iframeDoc.getElementById('scg-custom-styles');
      if (existing) existing.remove();
      iframeDoc.head.appendChild(style);
      return true;
    } else if (iframeDoc.body) {
      iframeDoc.body.insertBefore(style, iframeDoc.body.firstChild);
      return true;
    }
  } catch (e) {
    // Cross-origin restrictions
    return false;
  }
  return false;
}

