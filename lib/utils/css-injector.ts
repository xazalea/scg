/**
 * CSS Injection utilities for Cloud Shell iframe
 */

export const CLOUD_SHELL_CSS = `
  body {
    background: #f5f5f5 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
    color: #1a1a1a !important;
  }
  .cloudshell-container, .cloudshell-main, #cloudshell {
    border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
    background: #ffffff !important;
    border: 1px solid #e0e0e0 !important;
  }
  .terminal, .editor, .xterm, .xterm-screen, .xterm-viewport {
    background: #ffffff !important;
    border-radius: 8px !important;
    border: 1px solid #e0e0e0 !important;
  }
  .xterm-viewport {
    background: transparent !important;
  }
  .xterm-cursor-layer {
    background: #1a1a1a !important;
  }
  /* Hide Google branding - monochrome style */
  .google-logo, [aria-label*="Google"], .gb_logo, .gb_ua, .gb_oa,
  .gb_1a, .gb_2a, .gb_3a, .gb_4a, .gb_5a, .gb_6a, .gb_7a, .gb_8a {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  /* Custom scrollbar - monochrome */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: #b0b0b0;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #808080;
  }
  /* Terminal colors - monochrome */
  .xterm .xterm-screen {
    background-color: #ffffff !important;
  }
  .xterm .xterm-text-layer {
    color: #1a1a1a !important;
  }
  /* Buttons and controls */
  button, .button, [role="button"] {
    background: #1a1a1a !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
  }
  button:hover, .button:hover {
    background: #2a2a2a !important;
  }
  /* Input fields */
  input, textarea {
    background: #ffffff !important;
    border: 1px solid #e0e0e0 !important;
    color: #1a1a1a !important;
    border-radius: 8px !important;
  }
  input:focus, textarea:focus {
    border-color: #1a1a1a !important;
    outline: none !important;
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

