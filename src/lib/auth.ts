import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserService } from '@/lib/services';
import {SESSION_TIMEOUTS} from "@/lib/constants/session-constants";

/**
 * Helper function to check if hostname is a local/invalid IP
 * Exported for reuse in test files to prevent code duplication (Issue #499)
 */
export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

/**
 * Helper function to enhance session user data
 * Reduces complexity in session callback (Issue #526)
 */
export async function enhanceSessionUserData(session: any, user: any): Promise<any> {
  // Add user data to session from database user
  session.user.id = user.id ?? '';
  session.user.subscriptionTier = user.subscriptionTier || 'free';

  // Get additional user data from UserService if needed
  if (user.email && (!session.user.name || !session.user.subscriptionTier)) {
    try {
      const userResult = await UserService.getUserByEmail(user.email);
      if (userResult.success && userResult.data) {
        const userData = userResult.data;
        session.user.subscriptionTier = userData.subscriptionTier || 'free';
        if (!session.user.name) {
          session.user.name = `${userData.firstName} ${userData.lastName}`;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch additional user data:', error);
    }
  }

  return session;
}

/**
 * Helper function to validate user sign in
 * Reduces complexity in signIn callback (Issue #526)
 */
export async function validateUserSignIn(user: any, account: any): Promise<boolean> {
  if (!user?.email) {
    console.warn('SignIn callback: Missing user email');
    return false;
  }

  // For credentials provider, user is already authenticated by authorize function
  if (account?.provider === 'credentials') {
    return true;
  }

  // For other providers, validate user exists in our system
  const userResult = await UserService.getUserByEmail(user.email);
  if (!userResult.success) {
    console.warn(`SignIn callback: User not found in system: ${user.email}`);
    return false;
  }

  return true;
}

/**
 * Validates hostname for production environment
 * Exported for reuse in test files to prevent code duplication (Issue #499)
 */
export function isValidProductionHostname(hostname: string): boolean {
  return process.env.NODE_ENV !== 'production' || !isLocalHostname(hostname);
}

/**
 * Validates and sanitizes NEXTAUTH_URL for security
 * Prevents redirect to invalid URLs like 0.0.0.0 (Issue #438)
 * Exported for reuse in test files to prevent code duplication (Issue #499)
 */
export function validateNextAuthUrl(inputUrl?: string): string | undefined {
  const url = inputUrl || process.env.NEXTAUTH_URL;

  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    if (!isValidProductionHostname(parsedUrl.hostname)) {
      console.warn(
        `Invalid NEXTAUTH_URL for production: ${url}. Using fallback.`
      );
      return undefined;
    }

    return url;
  } catch (error) {
    console.warn(`Invalid NEXTAUTH_URL format: ${url}. Error: ${error}`);
    return undefined;
  }
}

// Note: MongoDB client setup removed since we're using JWT strategy
// The UserService handles its own database connections for user management

// Validate NEXTAUTH_URL to prevent invalid redirects (Issue #438)
const validatedNextAuthUrl = validateNextAuthUrl();


const authConfig = NextAuth({
  // Note: When using JWT strategy, we don't use a database adapter
  // The MongoDBAdapter is only needed for database sessions
  trustHost:
    process.env.AUTH_TRUST_HOST === 'true' ||
    process.env.NODE_ENV === 'production',

  ...(validatedNextAuthUrl && { url: validatedNextAuthUrl }),
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
          const result = await UserService.getUserByEmail(
            credentials.email as string
          );
          if (!result.success) {
            return null;
          }

          const rememberMe = credentials.rememberMe === 'true';

          const authResult = await UserService.authenticateUser({
            email: credentials.email as string,
            password: credentials.password as string,
            rememberMe,
          });

          if (!authResult.success || !authResult.data) {
            return null;
          }

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
  session: {
    strategy: 'jwt',
    maxAge: SESSION_TIMEOUTS.MAX_AGE, // 30 days
    updateAge: SESSION_TIMEOUTS.UPDATE_AGE, // 24 hours
  },
  jwt: {
    maxAge: SESSION_TIMEOUTS.MAX_AGE, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Fix for Issue #620: Extend cookie max age to match session max age
        maxAge: SESSION_TIMEOUTS.MAX_AGE,
        // Add domain configuration for production environments
        ...(process.env.NODE_ENV === 'production' && {
          domain: process.env.COOKIE_DOMAIN || undefined,
        }),
      },
    },
    // Add PKCE state cookie configuration for better security
    ...(process.env.NODE_ENV === 'production' && {
      pkceCodeVerifier: {
        name: '__Secure-next-auth.pkce.code_verifier',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          maxAge: 900, // 15 minutes
        },
      },
    }),
  },
  callbacks: {
    async jwt({ token, user, trigger }: { token: any; user?: any; trigger?: string }) {
      // If user is provided (on signin), store user data in token
      if (user) {
        token.id = user.id;
        token.subscriptionTier = user.subscriptionTier;
        token.email = user.email;
        token.name = user.name;
        // Fix for Issue #620: Add timestamp for token creation tracking
        token.createdAt = Date.now();
        token.isEmailVerified = user.isEmailVerified ?? true;
      }

      // Fix for Issue #620: Validate and refresh user data on token access
      if (trigger === 'update' || (!user && token.email)) {
        try {
          // Refresh user data from database to ensure consistency
          const userResult = await UserService.getUserByEmail(token.email);
          if (userResult.success && userResult.data) {
            const userData = userResult.data;
            token.subscriptionTier = userData.subscriptionTier || 'free';
            token.isEmailVerified = userData.isEmailVerified;
            // Update user name if it has changed
            const fullName = `${userData.firstName} ${userData.lastName}`;
            if (fullName !== token.name) {
              token.name = fullName;
            }
          }
        } catch (error) {
          console.warn('Failed to refresh user data in JWT callback:', error);
          // Don't fail the token validation, just log the warning
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      try {
        if (!session?.user || !token) {
          console.warn('Session callback: Missing session or token data');
          return session;
        }

        // Fix for Issue #620: Ensure all required fields are present
        if (!token.id || !token.email) {
          console.warn('Session callback: Invalid token data - missing required fields');
          return null;
        }

        // Add user data from JWT token to session
        session.user.id = token.id;
        session.user.subscriptionTier = token.subscriptionTier || 'free';
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.isEmailVerified = token.isEmailVerified ?? true;

        // Fix for Issue #620: Add token metadata for debugging
        if (process.env.NODE_ENV === 'development') {
          session.debug = {
            tokenCreatedAt: token.createdAt,
            tokenAge: token.createdAt ? Date.now() - token.createdAt : null,
          };
        }

        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return null;
      }
    },
    async signIn({ user, account, profile: _profile, email: _email, credentials: _credentials }) {
      try {
        // Fix for Issue #620: Enhanced signin validation with better error handling
        if (!user?.email) {
          console.warn('SignIn callback: Missing user email');
          return false;
        }

        // For credentials provider, user is already authenticated by authorize function
        if (account?.provider === 'credentials') {
          // Additional validation: ensure user has required verification status
          try {
            const userResult = await UserService.getUserByEmail(user.email);
            if (!userResult.success || !userResult.data) {
              console.warn(`SignIn callback: User not found after credentials auth: ${user.email}`);
              return false;
            }

            // Store email verification status in user object for token creation
            (user as any).isEmailVerified = userResult.data.isEmailVerified;

            return true;
          } catch (dbError) {
            console.error('SignIn callback: Database error during user validation:', dbError);
            return false;
          }
        }

        // For other providers, use existing validation
        return await validateUserSignIn(user, account);
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      try {
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }

        const parsedUrl = new URL(url);
        const parsedBaseUrl = new URL(baseUrl);

        if (parsedUrl.origin === parsedBaseUrl.origin) {
          return url;
        }

        if (process.env.NODE_ENV === 'production') {
          const trustedDomains = [
            'dnd-tracker-next-js.fly.dev',
            'dnd-tracker.fly.dev',
            'dndtracker.com',
            'www.dndtracker.com',
          ];

          if (trustedDomains.includes(parsedUrl.hostname)) {
            return url;
          }
        }

        console.warn(`Blocked redirect to untrusted URL: ${url}`);
        return baseUrl;
      } catch (error) {
        console.error('Redirect callback error:', error);
        return baseUrl;
      }
    },
  },
  pages: {
    signIn: '/signin',
    error: '/error',
  },
  debug: process.env.NODE_ENV === 'development',
});

export const { handlers, auth, signIn, signOut } = authConfig;


