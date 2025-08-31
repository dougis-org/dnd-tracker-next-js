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
  // Add your production hostnames here
  const validHostnames = [
    'localhost',
    '127.0.0.1',
    'dnd-tracker.vercel.app'
  ];

  return validHostnames.some(valid =>
    hostname === valid || hostname.endsWith(`.${valid}`)
  );
}

/**
 * Validates if hostname is localhost
 */
export function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:');
}

/**
 * Validates NextAuth URL (kept for compatibility)
 */
export function validateNextAuthUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return isValidProductionHostname(parsedUrl.hostname);
  } catch {
    return false;
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