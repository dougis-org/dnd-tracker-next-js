/**
 * SSO Redirect Handler Utility
 *
 * Common functionality for handling secure redirects in SSO callback pages.
 * Validates redirect URLs to prevent open redirect vulnerabilities.
 */

export interface SSORedirectOptions {
  redirectUrl?: string | null;
  defaultRedirect: string;
}

/**
 * Determines the safe redirect URL for SSO authentication callbacks.
 *
 * @param options - Redirect configuration options
 * @returns The validated redirect URL to use
 */
export function getSafeRedirectUrl({ redirectUrl, defaultRedirect }: SSORedirectOptions): string {
  if (!redirectUrl) {
    return defaultRedirect;
  }

  try {
    const url = new URL(redirectUrl);
    // Only allow same-origin redirects for security
    if (url.origin === window.location.origin) {
      return redirectUrl;
    }
  } catch (error) {
    // Invalid URL, fall through to default redirect
    console.warn('Invalid redirect URL:', redirectUrl, error);
  }

  return defaultRedirect;
}