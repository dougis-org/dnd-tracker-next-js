import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserService } from './services/UserService';

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

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL !== '1' &&
    process.env.CI !== 'true'
  ) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  // For build time or CI environment, use a placeholder URI that won't be used
  console.warn('MONGODB_URI not set, using placeholder for build/CI');
}

const client = new MongoClient(
  mongoUri || 'mongodb://localhost:27017/placeholder'
);
const clientPromise = Promise.resolve(client);

// Validate NEXTAUTH_URL to prevent invalid redirects (Issue #438)
const validatedNextAuthUrl = validateNextAuthUrl();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB_NAME,
  }),
  // Fix for Issue #434 & #473: NextAuth v5 requires explicit trust host configuration
  // This prevents "UntrustedHost" errors and token persistence issues in production deployments
  // In production environments (including Fly.io), we need to trust the host automatically
  trustHost:
    process.env.AUTH_TRUST_HOST === 'true' ||
    process.env.NODE_ENV === 'production',

  // Use validated URL to prevent redirects to invalid URLs like 0.0.0.0 (Issue #438)
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
          // Get user by email
          const result = await UserService.getUserByEmail(
            credentials.email as string
          );
          if (!result.success) {
            return null;
          }

          // Convert rememberMe from string to boolean (NextAuth passes form values as strings)
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
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      try {
        // Enhanced session callback for Issue #438: Better authentication state management
        if (!session?.user || !user) {
          console.warn('Session callback: Missing session or user data');
          return session;
        }

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
      } catch (error) {
        console.error('Session callback error:', error);
        return null; // Force re-authentication on error
      }
    },
    async signIn({ user, account, profile: _profile, email: _email, credentials: _credentials }) {
      try {
        // Enhanced signIn callback for database session management
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
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      try {
        // Enhanced redirect callback for Issue #438: Prevent invalid redirects

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
        return baseUrl; // Fallback to base URL
      } catch (error) {
        console.error('Redirect callback error:', error);
        return baseUrl; // Safe fallback
      }
    },
  },
  pages: {
    signIn: '/signin',
    error: '/error',
  },
  debug: process.env.NODE_ENV === 'development',
});
