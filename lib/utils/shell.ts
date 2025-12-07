/**
 * Utility functions for Cloud Shell integration
 */

export interface ShellConfig {
  showIde: boolean;
  showTerminal: boolean;
}

/**
 * Generate Google Cloud Shell URL
 */
export function generateShellUrl(config: Partial<ShellConfig> = {}): string {
  const { showIde = true, showTerminal = true } = config;
  
  const params = new URLSearchParams();
  
  if (showIde && showTerminal) {
    params.set('show', 'ide%2Cterminal');
  } else if (showIde) {
    params.set('show', 'ide');
  } else if (showTerminal) {
    params.set('show', 'terminal');
  }
  
  return `https://shell.cloud.google.com/?${params.toString()}`;
}

/**
 * Check if Cloud Shell is accessible
 */
export function isCloudShellAccessible(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return false;
  
  // Cloud Shell requires HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    return window.location.protocol === 'https:';
  }
  
  return true;
}

