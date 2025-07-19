import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserService } from './services/UserService';

/**
 * Validates and sanitizes NEXTAUTH_URL for security
 * Prevents redirect to invalid URLs like 0.0.0.0 (Issue #438)
 */
function validateNextAuthUrl(): string | undefined {
  const url = process.env.NEXTAUTH_URL;

  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    // Prevent localhost/local IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname;

      // Block localhost, local IPs, and invalid hostnames
      if (
        hostname === 'localhost' ||
        hostname === '0.0.0.0' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        console.warn(`Invalid NEXTAUTH_URL for production: ${url}. Using fallback.`);
        return undefined;
      }
    }

    return url;
  } catch (error) {
    console.warn(`Invalid NEXTAUTH_URL format: ${url}. Error: ${error}`);
    return undefined;
  }
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' && process.env.CI !== 'true') {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  // For build time or CI environment, use a placeholder URI that won't be used
  console.warn('MONGODB_URI not set, using placeholder for build/CI');
}

const client = new MongoClient(mongoUri || 'mongodb://localhost:27017/placeholder');
const clientPromise = Promise.resolve(client);

// Validate NEXTAUTH_URL to prevent invalid redirects (Issue #438)
const validatedNextAuthUrl = validateNextAuthUrl();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB_NAME,
  }),
  // Fix for Issue #434: NextAuth v5 requires explicit trust host configuration
  // This prevents "UntrustedHost" errors in production deployments
  trustHost: process.env.AUTH_TRUST_HOST === 'true',

  // Use validated URL to prevent redirects to invalid URLs like 0.0.0.0 (Issue #438)
  ...(validatedNextAuthUrl && { url: validatedNextAuthUrl }),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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

          // Authenticate user
          const authResult = await UserService.authenticateUser({
            email: credentials.email as string,
            password: credentials.password as string,
            rememberMe: false,
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
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      try {
        // Enhanced session callback for Issue #438: Better authentication state management
        if (!session?.user || !token) {
          console.warn('Session callback: Missing session or token data');
          return session;
        }

        // Validate token expiration to prevent authentication bypass
        if (token.exp && Date.now() >= token.exp * 1000) {
          console.warn('Session callback: Token has expired');
          return null; // Force re-authentication
        }

        // Add user ID and subscription tier to session from JWT token
        session.user.id = token.sub ?? '';
        session.user.subscriptionTier = token.subscriptionTier || 'free';

        // Ensure user has a valid name
        if (!session.user.name && token.firstName && token.lastName) {
          session.user.name = `${token.firstName} ${token.lastName}`;
        }

        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return null; // Force re-authentication on error
      }
    },
    async jwt({ token, user }: { token: any; user?: any }) {
      try {
        // Enhanced JWT callback for Issue #438: Better token management
        if (user) {
          // Store additional user data in token for session persistence
          token.subscriptionTier = (user as any).subscriptionTier || 'free';
          token.firstName = (user as any).firstName || '';
          token.lastName = (user as any).lastName || '';
          token.email = (user as any).email || token.email;
        }

        // Ensure token has required fields
        if (!token.sub && user?.id) {
          token.sub = user.id;
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token; // Return existing token to prevent complete failure
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
            'www.dndtracker.com'
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
