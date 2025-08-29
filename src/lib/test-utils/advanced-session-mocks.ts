/**
 * Advanced Session Mock Utilities for Issue #537
 *
 * Production-realistic session and JWT token mocking for comprehensive testing
 * Consolidates and improves upon existing session mock utilities
 */

import { ObjectId } from 'mongodb';
import { SESSION_TIMEOUTS } from '@/lib/constants/session-constants';
import { NextRequest } from 'next/server';

/**
 * Valid subscription tiers based on User model validation
 */
export const VALID_SUBSCRIPTION_TIERS = ['free', 'seasoned', 'expert', 'master', 'guild'] as const;
export type SubscriptionTier = typeof VALID_SUBSCRIPTION_TIERS[number];

/**
 * Production environment configuration
 * Updated to use Clerk session management
 */
export const PRODUCTION_CONFIG = {
  COOKIE_NAME: '__Secure-clerk-session',
  COOKIE_OPTIONS: {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: true,
  },
  TRUSTED_DOMAINS: [
    'dnd-tracker-next-js.fly.dev',
    'dnd-tracker.fly.dev',
    'dndtracker.com',
    'www.dndtracker.com',
  ],
} as const;

/**
 * Development environment configuration
 * Updated to use Clerk session management
 */
export const DEVELOPMENT_CONFIG = {
  COOKIE_NAME: 'clerk-session',
  COOKIE_OPTIONS: {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: false,
  },
} as const;

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  dndEdition?: string;
  experienceLevel?: string;
  primaryRole?: string;
}

/**
 * Structure representing a Clerk-issued JWT token, used for mocking authentication and session
 * tokens in comprehensive Clerk session testing scenarios.
 */
export interface JWTToken {
  sub: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  name?: string;
  iat: number;
  exp: number;
  jti: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Application session structure specifically for Clerk-based authentication,
 * representing the standardized session data structure used throughout the application
 * after migrating from NextAuth to Clerk.
 */
export interface SessionStructure {
  user: {
    id: string;
    email: string;
    name?: string;
    subscriptionTier: SubscriptionTier;
  };
  expires: string;
}

/**
 * Session creation options
 */
export interface SessionOptions {
  userId?: string;
  email?: string;
  subscriptionTier?: SubscriptionTier;
  name?: string;
  firstName?: string;
  lastName?: string;
  expiresInSeconds?: number;
  isExpired?: boolean;
  environment?: 'production' | 'development';
}

/**
 * Creates a realistic JWT token for testing
 */
export function createRealisticJWTToken(options: SessionOptions = {}): JWTToken {
  const now = Math.floor(Date.now() / 1000);
  const userId = options.userId || new ObjectId().toString();
  const subscriptionTier = options.subscriptionTier || 'free';

  return {
    sub: userId,
    email: options.email || 'test@example.com',
    subscriptionTier,
    name: options.name || `${options.firstName || 'Test'} ${options.lastName || 'User'}`.trim(),
    iat: now,
    exp: now + (options.expiresInSeconds || SESSION_TIMEOUTS.MAX_AGE),
    jti: `jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    firstName: options.firstName,
    lastName: options.lastName,
  };
}

/**
 * Creates a realistic session matching production structure
 */
export function createRealisticSession(options: SessionOptions = {}): SessionStructure {
  const userId = options.userId || new ObjectId().toString();
  const subscriptionTier = options.subscriptionTier || 'free';
  const expiresSeconds = options.expiresInSeconds || SESSION_TIMEOUTS.MAX_AGE;

  const expires = options.isExpired
    ? new Date(Date.now() - 1000).toISOString()
    : new Date(Date.now() + expiresSeconds * 1000).toISOString();

  return {
    user: {
      id: userId,
      email: options.email || 'test@example.com',
      name: options.name || `${options.firstName || 'Test'} ${options.lastName || 'User'}`.trim(),
      subscriptionTier,
    },
    expires,
  };
}

/**
 * Creates a realistic user profile matching database structure
 */
export function createRealisticUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const userId = overrides.id || new ObjectId().toString();
  const subscriptionTier = overrides.subscriptionTier || 'free';

  return {
    id: userId,
    email: overrides.email || 'test@example.com',
    name: overrides.name || `${overrides.firstName || 'Test'} ${overrides.lastName || 'User'}`.trim(),
    subscriptionTier,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    displayName: overrides.displayName || 'Test User',
    timezone: overrides.timezone || 'America/New_York',
    dndEdition: overrides.dndEdition || 'D&D 5e',
    experienceLevel: overrides.experienceLevel || 'experienced',
    primaryRole: overrides.primaryRole || 'dm',
    ...overrides,
  };
}

/**
 * Creates realistic session cookies for testing
 */
export function createSessionCookies(
  session: SessionStructure,
  environment: 'production' | 'development' = 'development'
): Record<string, string> {
  const config = environment === 'production' ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;

  return {
    [config.COOKIE_NAME]: JSON.stringify({
      user: session.user,
      expires: session.expires,
    }),
  };
}

/**
 * Creates expired session scenarios
 */
export function createExpiredSession(): SessionStructure {
  return createRealisticSession({
    isExpired: true,
    expiresInSeconds: -3600, // 1 hour ago
  });
}

/**
 * Creates soon-to-expire session (within 1 hour)
 */
export function createSoonToExpireSession(): SessionStructure {
  return createRealisticSession({
    expiresInSeconds: 1800, // 30 minutes from now
  });
}

/**
 * Creates sessions for each subscription tier
 */
export function createSubscriptionTierSessions(): Record<SubscriptionTier, SessionStructure> {
  const sessions: Record<SubscriptionTier, SessionStructure> = {} as any;

  VALID_SUBSCRIPTION_TIERS.forEach(tier => {
    sessions[tier] = createRealisticSession({
      subscriptionTier: tier,
      email: `${tier}@example.com`,
      name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} User`,
    });
  });

  return sessions;
}

/**
 * Creates JWT tokens for each subscription tier
 */
export function createSubscriptionTierTokens(): Record<SubscriptionTier, JWTToken> {
  const tokens: Record<SubscriptionTier, JWTToken> = {} as any;

  VALID_SUBSCRIPTION_TIERS.forEach(tier => {
    tokens[tier] = createRealisticJWTToken({
      subscriptionTier: tier,
      email: `${tier}@example.com`,
      name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} User`,
    });
  });

  return tokens;
}

/**
 * Creates mock request headers with session cookies
 */
export function createRequestWithSession(
  session: SessionStructure,
  environment: 'production' | 'development' = 'development'
): Headers {
  const cookies = createSessionCookies(session, environment);
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');

  return new Headers({
    'cookie': cookieHeader,
    'content-type': 'application/json',
  });
}

/**
 * Creates realistic authentication scenarios
 */
export const AUTH_SCENARIOS = {
  AUTHENTICATED_USER: {
    session: () => createRealisticSession({ subscriptionTier: 'expert' }),
    token: () => createRealisticJWTToken({ subscriptionTier: 'expert' }),
    description: 'Authenticated user with expert subscription',
  },

  FREE_USER: {
    session: () => createRealisticSession({ subscriptionTier: 'free' }),
    token: () => createRealisticJWTToken({ subscriptionTier: 'free' }),
    description: 'Authenticated user with free subscription',
  },

  GUILD_MASTER: {
    session: () => createRealisticSession({ subscriptionTier: 'guild' }),
    token: () => createRealisticJWTToken({ subscriptionTier: 'guild' }),
    description: 'Authenticated user with guild master subscription',
  },

  EXPIRED_SESSION: {
    session: () => createExpiredSession(),
    token: () => createRealisticJWTToken({ expiresInSeconds: -3600 }),
    description: 'User with expired session',
  },

  SOON_TO_EXPIRE: {
    session: () => createSoonToExpireSession(),
    token: () => createRealisticJWTToken({ expiresInSeconds: 1800 }),
    description: 'User with session expiring soon',
  },

  UNAUTHENTICATED: {
    session: () => null,
    token: () => null,
    description: 'Unauthenticated user',
  },
} as const;

/**
 * Middleware test helpers
 */
export function createMiddlewareRequest(
  pathname: string,
  session?: SessionStructure | null,
  environment: 'production' | 'development' = 'development'
): NextRequest {
  const headers = session ? createRequestWithSession(session, environment) : new Headers();

  return {
    nextUrl: { pathname },
    url: `https://dnd-tracker-next-js.fly.dev${pathname}`,
    headers,
    json: jest.fn(),
  } as unknown as NextRequest;
}

/**
 * Production environment test setup
 */
export function setupProductionEnvironment(): void {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    NEXTAUTH_URL: 'https://dnd-tracker-next-js.fly.dev',
    NEXTAUTH_SECRET: 'test-production-secret',
    AUTH_TRUST_HOST: 'true',
  });
}

/**
 * Development environment test setup
 */
export function setupDevelopmentEnvironment(): void {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'test-development-secret',
    AUTH_TRUST_HOST: 'false',
  });
}

/**
 * Validation helpers for session testing
 */
export const SessionValidation = {

  /**
   * Validates that a session has the required structure
   */
  isValidSession(session: any): session is SessionStructure {
    return (
      session &&
      typeof session === 'object' &&
      session.user &&
      typeof session.user === 'object' &&
      typeof session.user.id === 'string' &&
      typeof session.user.email === 'string' &&
      VALID_SUBSCRIPTION_TIERS.includes(session.user.subscriptionTier) &&
      typeof session.expires === 'string'
    );
  },

  /**
   * Validates that a JWT token has the required structure
   */
  isValidJWTToken(token: any): token is JWTToken {
    return (
      token &&
      typeof token === 'object' &&
      typeof token.sub === 'string' &&
      typeof token.email === 'string' &&
      VALID_SUBSCRIPTION_TIERS.includes(token.subscriptionTier) &&
      typeof token.iat === 'number' &&
      typeof token.exp === 'number' &&
      typeof token.jti === 'string'
    );
  },

  /**
   * Checks if a session is expired
   */
  isExpired(session: SessionStructure): boolean {
    return new Date(session.expires) < new Date();
  },

  /**
   * Checks if a session expires within the specified minutes
   */
  expiresWithin(session: SessionStructure, minutes: number): boolean {
    const expiresDate = new Date(session.expires);
    const now = new Date();
    const diffMinutes = (expiresDate.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= minutes && diffMinutes > 0;
  },
};

/**
 * Test data generators for comprehensive testing
 */
export const TestDataGenerators = {

  /**
   * Generates users with all subscription tiers
   */
  generateUsersByTier(): Record<SubscriptionTier, UserProfile> {
    const users: Record<SubscriptionTier, UserProfile> = {} as any;

    VALID_SUBSCRIPTION_TIERS.forEach(tier => {
      users[tier] = createRealisticUserProfile({
        subscriptionTier: tier,
        email: `${tier}-user@example.com`,
        name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} User`,
      });
    });

    return users;
  },

  /**
   * Generates sessions with different expiration times
   */
  generateSessionsByExpiration(): Record<string, SessionStructure> {
    return {
      valid: createRealisticSession({ expiresInSeconds: SESSION_TIMEOUTS.MAX_AGE }),
      expiresSoon: createSoonToExpireSession(),
      expired: createExpiredSession(),
      oneHour: createRealisticSession({ expiresInSeconds: 3600 }),
      oneDay: createRealisticSession({ expiresInSeconds: 86400 }),
      oneWeek: createRealisticSession({ expiresInSeconds: 604800 }),
    };
  },

  /**
   * Generates JWT tokens with different expiration times
   */
  generateTokensByExpiration(): Record<string, JWTToken> {
    return {
      valid: createRealisticJWTToken({ expiresInSeconds: SESSION_TIMEOUTS.MAX_AGE }),
      expiresSoon: createRealisticJWTToken({ expiresInSeconds: 1800 }),
      expired: createRealisticJWTToken({ expiresInSeconds: -3600 }),
      oneHour: createRealisticJWTToken({ expiresInSeconds: 3600 }),
      oneDay: createRealisticJWTToken({ expiresInSeconds: 86400 }),
      oneWeek: createRealisticJWTToken({ expiresInSeconds: 604800 }),
    };
  },
};

/**
 * Backwards compatibility - re-export commonly used functions
 */
export { createMockSession, createMockUser } from './session-mocks';

// Re-export SESSION_TIMEOUTS for use in other files
export { SESSION_TIMEOUTS };

/**
 * Legacy compatibility - maps old function names to new ones
 */
export const LegacySessionMocks = {
  createMockSession: createRealisticSession,
  createMockUser: createRealisticUserProfile,
  createExpiredSession: createExpiredSession,
};