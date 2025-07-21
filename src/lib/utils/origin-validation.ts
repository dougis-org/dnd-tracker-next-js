/**
 * Origin validation utilities for authentication redirects
 * Addresses Issue #473: Handles development environment origin variations
 *
 * In development, users can access the application via:
 * - http://localhost:3000
 * - http://127.0.0.1:3000
 * - http://0.0.0.0:3000
 *
 * These should all be treated as equivalent trusted origins.
 */

/**
 * Checks if a hostname is a development/local hostname
 */
function isDevelopmentHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    // Also include common private network ranges for completeness
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

/**
 * Normalizes a development URL to use localhost for consistent comparison
 */
function normalizeDevelopmentOrigin(origin: string): string {
  try {
    const url = new URL(origin);

    if (isDevelopmentHostname(url.hostname)) {
      // Normalize all local development hosts to localhost
      return `${url.protocol}//localhost:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
    }

    return origin;
  } catch {
    return origin;
  }
}

/**
 * Validates if two origins should be considered equivalent for authentication purposes
 * Handles development environment variations where localhost, 127.0.0.1, and 0.0.0.0 are equivalent
 */
export function areOriginsEquivalent(origin1: string, origin2: string): boolean {
  // Direct comparison for exact matches
  if (origin1 === origin2) {
    return true;
  }

  // In development, normalize local origins for comparison
  if (process.env.NODE_ENV === 'development') {
    const normalizedOrigin1 = normalizeDevelopmentOrigin(origin1);
    const normalizedOrigin2 = normalizeDevelopmentOrigin(origin2);

    return normalizedOrigin1 === normalizedOrigin2;
  }

  // In production, require exact match
  return false;
}

/**
 * Validates if a callback URL is safe to redirect to
 * Enhanced version that handles development environment variations
 */
export function isValidCallbackUrl(
  callbackUrl: string,
  currentOrigin: string,
  options: {
    allowRelative?: boolean;
    allowedDomains?: string[];
  } = {}
): boolean {
  const { allowRelative = true, allowedDomains = [] } = options;

  try {
    // Relative URLs are generally safe if allowed
    if (callbackUrl.startsWith('/')) {
      return allowRelative;
    }

    // Parse the callback URL
    const url = new URL(callbackUrl);

    // Check against current origin with development-aware comparison
    if (areOriginsEquivalent(url.origin, currentOrigin)) {
      return true;
    }

    // Check against explicitly allowed domains
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => {
        // Support both exact matches and domain patterns
        return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
      });
    }

    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Gets production-safe trusted domains based on environment
 */
export function getTrustedDomains(): string[] {
  if (process.env.NODE_ENV === 'production') {
    return [
      'dnd-tracker-next-js.fly.dev',
      'dnd-tracker.fly.dev',
      'dndtracker.com',
      'www.dndtracker.com'
    ];
  }

  // In development/staging, be more permissive but still secure
  return [];
}