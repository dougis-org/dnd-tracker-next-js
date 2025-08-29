/**
 * Session constants for centralized session management (Issue #585)
 * Provides consistent cookie names and timeouts across the application
 * Updated to use Clerk session management
 */

/**
 * Session cookie name based on environment
 * Updated to use Clerk's session management
 */
export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-clerk-session'
  : 'clerk-session';

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
 * Legacy collection names for MongoDB
 * Historical reference - these are no longer used with Clerk
 */
export const LEGACY_COLLECTION_NAMES = {
  SESSIONS: 'sessions',
  USERS: 'users',
  ACCOUNTS: 'accounts',
  VERIFICATION_TOKENS: 'verification_tokens',
} as const;

/**
 * Default database name
 */
export const DEFAULT_DATABASE_NAME = 'dnd-tracker';