/**
 * Shared authentication callbacks for NextAuth configurations
 * Reduces complexity in auth configuration files by extracting reusable callbacks
 */

import { UserService } from '../services/UserService';
import { TRUSTED_DOMAINS } from '../constants/session-constants';

/**
 * Enhanced session callback for database strategy
 */
export async function enhancedSessionCallback({ session, user }: { session: any; user: any }) {
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
export async function jwtCallback({ token, user }: { token: any; user?: any }) {
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
export async function redirectCallback({ url, baseUrl }: { url: string; baseUrl: string }) {
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
      if (TRUSTED_DOMAINS.includes(parsedUrl.hostname as any)) {
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
 * Credentials authorization function
 */
export async function authorizeCredentials(credentials: any) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  try {
    // Get user by email
    const result = await UserService.getUserByEmail(credentials.email as string);
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
}

/**
 * Event handlers for authentication events
 */
export const authEventHandlers = {
  async signIn({ user }: { user: any }) {
    console.log(`User signed in: ${user.email} (ID: ${user.id})`);
    // Note: Last login time update would be handled by the UserService
    // if needed for session management requirements
  },

  async signOut() {
    console.log('User signed out');
    // Session cleanup is handled automatically by the database adapter
  },

  async createUser({ user }: { user: any }) {
    console.log(`New user created: ${user.email} (ID: ${user.id})`);
  },

  async updateUser({ user }: { user: any }) {
    console.log(`User updated: ${user.email} (ID: ${user.id})`);
  },

  async linkAccount({ user }: { user: any }) {
    console.log(`Account linked to user: ${user.email}`);
  },

  async session({ session }: { session: any }) {
    // Called whenever a session is checked
    // Useful for debugging session access patterns
    if (process.env.NODE_ENV === 'development') {
      console.log(`Session accessed for user: ${session.user?.email}`);
    }
  },
};