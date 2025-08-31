/**
 * Session configuration for Clerk
 * Replaces NextAuth session configuration
 */

import { auth } from '@/lib/auth';

/**
 * Gets authentication configuration
 * This replaces NextAuth configuration for tests
 */
export async function getAuthConfig() {
  return {
    auth: auth,
    session: await auth(),
  };
}

/**
 * Session configuration constants
 */
export const SESSION_CONFIG = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
} as const;