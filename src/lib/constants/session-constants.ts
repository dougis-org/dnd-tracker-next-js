/**
 * Session configuration constants (Issue #524)
 *
 * Centralized constants to avoid duplication across session-related files
 */

/**
 * Session lifetime settings
 */
export const SESSION_TIMEOUTS = {
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  UPDATE_AGE: 24 * 60 * 60, // 24 hours
} as const;

/**
 * MongoDB collection names for NextAuth
 */
export const NEXTAUTH_COLLECTION_NAMES = {
  SESSIONS: 'sessions',
  USERS: 'users',
  ACCOUNTS: 'accounts',
  VERIFICATION_TOKENS: 'verification_tokens',
} as const;

/**
 * Trusted domains for production redirects
 */
export const TRUSTED_DOMAINS = [
  'dnd-tracker-next-js.fly.dev',
  'dnd-tracker.fly.dev',
  'dndtracker.com',
  'www.dndtracker.com',
] as const;

/**
 * Default database name
 */
export const DEFAULT_DATABASE_NAME = 'dnd-tracker';