/**
 * Enhanced NextAuth configuration with database session support (Issue #524)
 *
 * This module provides an alternative NextAuth configuration that uses database
 * sessions instead of JWT tokens for better session persistence and management.
 */

import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateNextAuthUrl } from './auth';
import {
  SESSION_TIMEOUTS,
  DEFAULT_DATABASE_NAME,
  NEXTAUTH_COLLECTION_NAMES,
} from '@/lib/constants/session-constants';
import {
  enhancedSessionCallback,
  jwtCallback,
  redirectCallback,
  authorizeCredentials,
  authEventHandlers,
} from './auth/auth-callbacks';
import {
  getCurrentSession as baseGetCurrentSession,
  hasValidSession as baseHasValidSession,
  getSessionUserId as baseGetSessionUserId,
} from './session/session-utilities';

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL !== '1' &&
    process.env.CI !== 'true'
  ) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  console.warn('MONGODB_URI not set, using placeholder for build/CI');
}

const client = new MongoClient(
  mongoUri || 'mongodb://localhost:27017/placeholder'
);
const clientPromise = Promise.resolve(client);

// Validate NEXTAUTH_URL to prevent invalid redirects (Issue #438)
const validatedNextAuthUrl = validateNextAuthUrl();


/**
 * Enhanced NextAuth configuration with database session strategy
 *
 * Key improvements over JWT strategy:
 * - Sessions are stored in MongoDB for better persistence
 * - Better server-side session management
 * - Improved security with server-side validation
 * - Support for session revocation
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB_NAME,
  }),

  // Use validated URL to prevent redirects to invalid URLs (Issue #438)
  ...(validatedNextAuthUrl && { url: validatedNextAuthUrl }),

  // Enhanced session configuration for database persistence
  session: {
    // Use database strategy instead of JWT for better persistence
    strategy: 'database',

    // Session lifetime configuration
    maxAge: SESSION_TIMEOUTS.MAX_AGE,
    updateAge: SESSION_TIMEOUTS.UPDATE_AGE,

    // Generate session token (optional customization)
    generateSessionToken: () => {
      // Use crypto.randomUUID() for secure session tokens
      return crypto.randomUUID();
    },
  },

  // Trust host configuration for production
  trustHost:
    process.env.AUTH_TRUST_HOST === 'true' ||
    process.env.NODE_ENV === 'production',

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      authorize: authorizeCredentials,
    }),
  ],

  callbacks: {
    session: enhancedSessionCallback,
    jwt: jwtCallback,
    redirect: redirectCallback,
  },

  pages: {
    signIn: '/signin',
    error: '/error',
  },

  debug: process.env.NODE_ENV === 'development',

  // Enhanced event handlers for database session management
  events: authEventHandlers,
});

/**
 * Helper function to get current session with enhanced error handling
 */
export const getCurrentSession = () => baseGetCurrentSession(auth);

/**
 * Helper function to check if user has valid session
 */
export const hasValidSession = () => baseHasValidSession(auth);

/**
 * Helper function to get user ID from session
 */
export const getSessionUserId = () => baseGetSessionUserId(auth);

/**
 * Configuration flags to control session strategy
 */
export const SESSION_CONFIG = {
  // Flag to enable database sessions (can be controlled via environment variable)
  USE_DATABASE_SESSIONS: process.env.USE_DATABASE_SESSIONS === 'true',

  // Session lifetime settings
  MAX_AGE: SESSION_TIMEOUTS.MAX_AGE,
  UPDATE_AGE: SESSION_TIMEOUTS.UPDATE_AGE,

  // Database settings
  DATABASE_NAME: process.env.MONGODB_DB_NAME || DEFAULT_DATABASE_NAME,
  COLLECTION_NAMES: NEXTAUTH_COLLECTION_NAMES,
} as const;