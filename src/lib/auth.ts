/**
 * Server-side authentication utilities using Clerk
 * Replaces NextAuth functionality
 */

import { auth as clerkAuth } from '@clerk/nextjs/server';

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