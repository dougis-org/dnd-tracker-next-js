/**
 * Centralized authentication utilities
 * Provider-agnostic authentication layer that abstracts Clerk/NextAuth details
 */

import { auth as clerkAuth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Server-side authentication function that returns user session
 * This replaces NextAuth's auth() function
 */
export const auth = clerkAuth;

/**
 * Validates hostname for production redirects
 */
export function isValidProductionHostname(hostname: string): boolean {
  // In production, localhost addresses are invalid for security
  if (process.env.NODE_ENV === 'production') {
    // Reject local/private hostnames in production
    if (isLocalHostname(hostname)) {
      return false;
    }
    // Allow all other hostnames (public domains) in production
    return true;
  }

  // In development, allow all hostnames including localhost
  return true;
}

/**
 * Validates if hostname is localhost or private network address
 */
export function isLocalHostname(hostname: string): boolean {
  // Direct localhost matches
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.startsWith('localhost:')) {
    return true;
  }

  // Check private IP ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, a, b] = match.map(Number);

    // 192.168.x.x (private)
    if (a === 192 && b === 168) return true;

    // 10.x.x.x (private)
    if (a === 10) return true;

    // 172.16.x.x - 172.31.x.x (private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 127.x.x.x (loopback)
    if (a === 127) return true;
  }

  return false;
}

/**
 * Validates NextAuth URL (kept for compatibility)
 */
export function validateNextAuthUrl(url?: string): string | undefined {
  const urlToValidate = url || process.env.NEXTAUTH_URL;

  if (!urlToValidate) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(urlToValidate);
    const isValid = isValidProductionHostname(parsedUrl.hostname);

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn(`Invalid NEXTAUTH_URL for production: ${urlToValidate}`);
      return undefined;
    }

    return isValid ? urlToValidate : undefined;
  } catch {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`Invalid NEXTAUTH_URL format: ${urlToValidate}`);
    }
    return undefined;
  }
}

/**
 * Gets user session from Clerk (alias for compatibility)
 */
export const getSession = auth;

/**
 * Gets current user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.userId || null;
}

// ============================================================================
// CENTRALIZED AUTHENTICATION FLOW UTILITIES
// ============================================================================

/**
 * Authentication configuration - single source of truth
 */
const AUTH_CONFIG = {
  SIGN_IN_URL: '/sign-in', // Clerk's default sign-in URL
  DEFAULT_REDIRECT: '/dashboard',
} as const;

/**
 * Centralized authentication check and redirect function
 * Use this in all server components that require authentication
 *
 * @param callbackUrl - URL to redirect to after successful sign-in
 * @returns User session if authenticated, throws redirect if not
 */
export async function requireAuth(callbackUrl?: string) {
  const session = await auth();

  if (!session?.userId) {
    const redirectUrl = callbackUrl
      ? `${AUTH_CONFIG.SIGN_IN_URL}?redirect_url=${encodeURIComponent(callbackUrl)}`
      : AUTH_CONFIG.SIGN_IN_URL;

    redirect(redirectUrl);
  }

  return session;
}

/**
 * Check if user is authenticated without redirecting
 * Use this for conditional rendering or client-side checks
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.userId;
}

/**
 * Get authenticated user ID or redirect to sign-in
 * Convenience function for common pattern
 */
export async function getAuthenticatedUserId(callbackUrl?: string): Promise<string> {
  const session = await requireAuth(callbackUrl);
  return session.userId!;
}

/**
 * Build sign-in URL with optional callback
 * Use this for consistent sign-in URL generation
 */
export function buildSignInUrl(callbackUrl?: string): string {
  if (!callbackUrl) {
    return AUTH_CONFIG.SIGN_IN_URL;
  }

  return `${AUTH_CONFIG.SIGN_IN_URL}?redirect_url=${encodeURIComponent(callbackUrl)}`;
}