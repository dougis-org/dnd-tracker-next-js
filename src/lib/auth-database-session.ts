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
import { UserService } from './services/UserService';
import {
  validateNextAuthUrl,
} from './auth';
import {
  SESSION_TIMEOUTS,
  NEXTAUTH_COLLECTION_NAMES,
  TRUSTED_DOMAINS,
  DEFAULT_DATABASE_NAME,
} from '@/lib/constants/session-constants';

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
 * Enhanced session callback for database strategy
 */
async function enhancedSessionCallback({ session, user }: { session: any; user: any }) {
  try {
    if (!session?.user) {
      console.warn('Database session callback: Missing session user data');
      return session;
    }

    // With database strategy, user comes from the database
    // Enhance session with additional user properties
    if (user) {
      session.user.id = user.id;
      session.user.subscriptionTier = user.subscriptionTier || 'free';

      // Ensure user has a valid name
      if (!session.user.name && user.name) {
        session.user.name = user.name;
      }
    }

    return session;
  } catch (error) {
    console.error('Database session callback error:', error);
    return null; // Force re-authentication on error
  }
}

/**
 * JWT callback - less important with database strategy but kept for compatibility
 */
async function jwtCallback({ token, user }: { token: any; user?: any }) {
  try {
    if (!token) {
      token = {};
    }

    if (user) {
      // Store additional user data in token
      token.subscriptionTier = (user as any).subscriptionTier || 'free';
      token.firstName = (user as any).firstName || '';
      token.lastName = (user as any).lastName || '';
      token.email = (user as any).email || token.email;
    }

    if (user?.id) {
      token.sub = user.id;
    }

    return token;
  } catch (error) {
    console.error('JWT callback error:', error);
    return token || {};
  }
}

/**
 * Enhanced redirect callback (same as JWT version)
 */
async function redirectCallback({ url, baseUrl }: { url: string; baseUrl: string }) {
  try {
    // If url is relative, make it absolute
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }

    // If url is absolute, validate it's safe
    const parsedUrl = new URL(url);
    const parsedBaseUrl = new URL(baseUrl);

    // Only allow redirects to the same origin
    if (parsedUrl.origin === parsedBaseUrl.origin) {
      return url;
    }

    // For production, only allow specific trusted domains
    if (process.env.NODE_ENV === 'production') {
      if (TRUSTED_DOMAINS.includes(parsedUrl.hostname)) {
        return url;
      }
    }

    console.warn(`Blocked redirect to untrusted URL: ${url}`);
    return baseUrl;
  } catch (error) {
    console.error('Redirect callback error:', error);
    return baseUrl;
  }
}

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Get user by email
          const result = await UserService.getUserByEmail(
            credentials.email as string
          );
          if (!result.success) {
            return null;
          }

          // Convert rememberMe from string to boolean
          const rememberMe = credentials.rememberMe === 'true';

          // Authenticate user
          const authResult = await UserService.authenticateUser({
            email: credentials.email as string,
            password: credentials.password as string,
            rememberMe,
          });

          if (!authResult.success || !authResult.data) {
            return null;
          }

          // Return user object for session
          const authenticatedUser = authResult.data.user;
          return {
            id: authenticatedUser.id?.toString() || '',
            email: authenticatedUser.email,
            name: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`,
            subscriptionTier: authenticatedUser.subscriptionTier,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
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
  events: {
    async signIn({ user, account: _account, profile: _profile, isNewUser: _isNewUser }) {
      console.log(`User signed in: ${user.email} (ID: ${user.id})`);
      // Note: Last login time update would be handled by the UserService
      // if needed for session management requirements
    },

    async signOut(_params) {
      console.log('User signed out');
      // Session cleanup is handled automatically by the database adapter
    },

    async createUser({ user }) {
      console.log(`New user created: ${user.email} (ID: ${user.id})`);
    },

    async updateUser({ user }) {
      console.log(`User updated: ${user.email} (ID: ${user.id})`);
    },

    async linkAccount({ user, account: _account, profile: _profile }) {
      console.log(`Account linked to user: ${user.email}`);
    },

    async session({ session }) {
      // Called whenever a session is checked
      // Useful for debugging session access patterns
      if (process.env.NODE_ENV === 'development') {
        console.log(`Session accessed for user: ${session.user?.email}`);
      }
    },
  },
});

/**
 * Helper function to get current session with enhanced error handling
 */
export async function getCurrentSession() {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Helper function to check if user has valid session
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    return Boolean(session?.user?.id);
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Helper function to get user ID from session
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await getCurrentSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting session user ID:', error);
    return null;
  }
}

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