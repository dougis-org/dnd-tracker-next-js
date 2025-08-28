/**
 * Session constants for centralized session management (Issue #585)
 * Provides consistent cookie names and timeouts across the application
 */

/**
 * Session cookie name based on environment
 * Uses secure cookie naming in production
 */
export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';

/**
 * Session timeout configuration
 */
export const SESSION_TIMEOUTS = {
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  UPDATE_AGE: 24 * 60 * 60,   // 24 hours in seconds
} as const;

/**
 * Trusted domains for cross-origin requests
 */
export const TRUSTED_DOMAINS = [
  'dnd-tracker-next-js.fly.dev',
  'dnd-tracker.fly.dev',
  'dndtracker.com',
  'www.dndtracker.com',
  'localhost:3000',
] as const;

/**
 * NextAuth collection names for MongoDB
 * Kept for backward compatibility during Clerk migration
 */
export const NEXTAUTH_COLLECTION_NAMES = {
  SESSIONS: 'sessions',
  USERS: 'users',
  ACCOUNTS: 'accounts',
  VERIFICATION_TOKENS: 'verification_tokens',
} as const;

/**
 * Default database name
 */
export const DEFAULT_DATABASE_NAME = 'dnd-tracker';