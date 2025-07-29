/**
 * Session Strategy Configuration (Issue #524)
 *
 * This module provides configuration utilities to switch between JWT and database
 * session strategies based on environment variables and application needs.
 */

import { SESSION_TIMEOUTS } from '@/lib/constants/session-constants';
import {
  getCurrentSession as baseGetCurrentSession,
  hasValidSession as baseHasValidSession,
  getSessionUserId as baseGetSessionUserId,
  getSessionUserTier as baseGetSessionUserTier,
} from './session/session-utilities';

/**
 * Session strategy options
 */
export type SessionStrategy = 'jwt' | 'database';

/**
 * Session configuration interface
 */
export interface SessionConfig {
  strategy: SessionStrategy;
  maxAge: number;
  updateAge: number;
  generateSessionToken?: () => string;
}

/**
 * Environment-based session configuration
 */
export const SESSION_STRATEGY: SessionStrategy =
  (process.env.NEXTAUTH_SESSION_STRATEGY as SessionStrategy) || 'jwt';

/**
 * Get session configuration based on strategy
 */
export function getSessionConfig(strategy?: SessionStrategy): SessionConfig {
  const selectedStrategy = strategy || SESSION_STRATEGY;

  const baseConfig = {
    maxAge: SESSION_TIMEOUTS.MAX_AGE,
    updateAge: SESSION_TIMEOUTS.UPDATE_AGE,
  };

  switch (selectedStrategy) {
    case 'database':
      return {
        ...baseConfig,
        strategy: 'database',
        generateSessionToken: () => crypto.randomUUID(),
      };

    case 'jwt':
    default:
      return {
        ...baseConfig,
        strategy: 'jwt',
      };
  }
}

/**
 * Check if database sessions are enabled
 */
export function isDatabaseSessionEnabled(): boolean {
  return SESSION_STRATEGY === 'database';
}

/**
 * Check if JWT sessions are enabled
 */
export function isJWTSessionEnabled(): boolean {
  return SESSION_STRATEGY === 'jwt';
}

/**
 * Get the appropriate auth configuration based on session strategy
 */
export async function getAuthConfig() {
  if (isDatabaseSessionEnabled()) {
    // Import database session configuration
    const { handlers, auth, signIn, signOut } = await import('./auth-database-session');
    return { handlers, auth, signIn, signOut };
  } else {
    // Import JWT session configuration (current)
    const { handlers, auth, signIn, signOut } = await import('./auth');
    return { handlers, auth, signIn, signOut };
  }
}

/**
 * Create session utility with auth configuration
 */
async function createSessionUtil<T>(
  utilFn: (_authConfig: any) => T,
): Promise<T> {
  const { auth } = await getAuthConfig();
  return utilFn(auth);
}

/**
 * Session utility functions
 */
const getCurrentSession = () => createSessionUtil(baseGetCurrentSession);
const hasValidSession = () => createSessionUtil(baseHasValidSession);
const getSessionUserId = () => createSessionUtil(baseGetSessionUserId);
const getSessionUserTier = () => createSessionUtil(baseGetSessionUserTier);

/**
 * Session persistence utilities
 */
export const sessionUtils = {
  getCurrentSession,
  hasValidSession,
  getSessionUserId,
  getSessionUserTier,
};

/**
 * Mongoose model registration fix for database sessions
 *
 * This ensures that NextAuth's MongoDB adapter doesn't conflict with
 * existing mongoose models by following the same registration pattern.
 */
export function ensureSessionModelRegistration() {
  if (!isDatabaseSessionEnabled()) {
    return; // Only needed for database sessions
  }

  // The NextAuth MongoDB adapter handles model registration internally
  // but we can add any custom session-related models here following
  // the established pattern from User.ts and Party.ts

  console.log('Database session strategy enabled - MongoDB adapter will handle model registration');
}

/**
 * Migrate between session strategies
 */
const createMigrationFn = (target: SessionStrategy) => () => {
  console.log(`Starting migration from ${SESSION_STRATEGY} to ${target} sessions...`);
  console.warn('Session migration requires application restart');
};

/**
 * Migration utility to switch between session strategies
 */
export const sessionMigration = {
  migrateToDatabase: createMigrationFn('database'),
  migrateToJWT: createMigrationFn('jwt'),
};

/**
 * Development utilities for testing session strategies
 */
export const sessionDebug = {
  logConfig: () => console.log('Session Configuration:', {
    strategy: SESSION_STRATEGY,
    isDatabaseEnabled: isDatabaseSessionEnabled(),
    isJWTEnabled: isJWTSessionEnabled(),
    config: getSessionConfig(),
  }),

  testPersistence: async () => {
    const session = await sessionUtils.getCurrentSession();
    console.log('Current Session:', {
      exists: Boolean(session),
      userId: session?.user?.id,
      email: session?.user?.email,
      strategy: SESSION_STRATEGY,
    });
  },
};