/**
 * Simplified authentication callbacks for NextAuth configurations
 */

import { UserService } from '../services/UserService';
import { TRUSTED_DOMAINS } from '../constants/session-constants';

/**
 * Enhanced session callback for database strategy
 */
export async function enhancedSessionCallback({ session, user }: { session: any; user: any }) {
  try {
    if (!session?.user) return session;

    if (user) {
      session.user.id = user.id;
      session.user.subscriptionTier = user.subscriptionTier || 'free';
      if (!session.user.name && user.name) {
        session.user.name = user.name;
      }
    }

    return session;
  } catch (error) {
    console.error('Database session callback error:', error);
    return null;
  }
}

/**
 * JWT callback
 */
export async function jwtCallback({ token, user }: { token: any; user: any }) {
  if (user) {
    token.id = user.id;
    token.subscriptionTier = user.subscriptionTier;
  }
  return token;
}

/**
 * Redirect callback
 */
export async function redirectCallback({ url, baseUrl }: { url: string; baseUrl: string }) {
  if (url.startsWith('/')) return `${baseUrl}${url}`;

  try {
    const parsedUrl = new URL(url);
    if (TRUSTED_DOMAINS.includes(parsedUrl.hostname as any)) {
      return url;
    }
  } catch {
    // Invalid URL, use baseUrl
  }

  return baseUrl;
}

/**
 * Authorize credentials
 */
export async function authorizeCredentials(credentials: any) {
  try {
    if (!credentials?.email || !credentials?.password) return null;

    const result = await UserService.authenticateUser({
      email: credentials.email,
      password: credentials.password,
      rememberMe: Boolean(credentials.rememberMe),
    });

    if (!result.success || !result.data) return null;

    const { user } = result.data;

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      subscriptionTier: user.subscriptionTier,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Auth event handlers
 */
export const authEventHandlers = {
  signIn: async ({ user }: { user: any }) => {
    console.log('User signed in:', user?.email);
  },
  signOut: async () => {
    console.log('User signed out');
  },
};