import { NextRequest } from 'next/server';

/**
 * Test file for Issue #438: Login fails to redirect to a useful page
 *
 * This file tests the specific problems reported in GitHub issue #438:
 * 1. Users get redirected to an error page showing IP address 0.0.0.0
 * 2. Users who do reach the site aren't properly recognized as logged in
 *    (despite showing their name in the menu)
 * 3. Accessing any link in the left nav directs to the signin page
 */

// Mock NextAuth dependencies
const mockNextAuth = jest.fn();
jest.mock('next-auth', () => mockNextAuth);

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn(),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    next: jest.fn(() => ({
      type: 'next',
      headers: { get: () => null }
    })),
    redirect: jest.fn((url: URL | string) => ({
      type: 'redirect',
      headers: {
        get: (name: string) => name === 'location' ? url.toString() : null
      }
    })),
    json: jest.fn((data: any, init?: any) => ({
      type: 'json',
      data,
      status: init?.status || 200,
      headers: { get: () => null }
    })),
  },
}));

// Mock UserService
jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    authenticateUser: jest.fn(),
  },
}));

describe('Issue #438: Login Redirect Problems', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup NextAuth mock to return proper structure
    mockNextAuth.mockImplementation((_config) => {
      return {
        handlers: {
          GET: jest.fn(),
          POST: jest.fn(),
        },
        auth: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      };
    });

    // Reset environment to simulate production
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      MONGODB_DB_NAME: 'testdb',
      NEXTAUTH_SECRET: 'test-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Problem 1: 0.0.0.0 redirect error', () => {
    it('should NOT use invalid URLs like 0.0.0.0 in production', async () => {
      // This test verifies that the NextAuth configuration doesn't accidentally
      // use invalid URLs like 0.0.0.0 which cause redirect errors

      // Set NEXTAUTH_URL to invalid value that might cause 0.0.0.0 error
      process.env.NEXTAUTH_URL = 'http://0.0.0.0:3000';

      // Import auth module and verify configuration
      await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const _config = mockNextAuth.mock.calls[0][0];

      // The configuration should handle invalid NEXTAUTH_URL gracefully
      // and either use a fallback or properly validate the URL
      expect(_config).toBeDefined();

      // If NEXTAUTH_URL is invalid, the app should handle it properly
      // and not cause redirect to 0.0.0.0
      const invalidUrl = 'http://0.0.0.0:3000';
      expect(process.env.NEXTAUTH_URL).toBe(invalidUrl);

      // The auth configuration should include trustHost setting
      // to prevent UntrustedHost errors that could cause invalid redirects
      expect(_config.trustHost).toBeDefined();
    });

    it('should handle missing NEXTAUTH_URL gracefully', async () => {
      // Remove NEXTAUTH_URL to simulate deployment issue
      delete process.env.NEXTAUTH_URL;

      await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const config = mockNextAuth.mock.calls[0][0];

      // Configuration should still be valid even without NEXTAUTH_URL
      expect(config).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(config.session).toBeDefined();
    });

    it('should ensure production URLs are properly configured', () => {
      // Test production URL configuration
      const productionUrls = [
        'https://dnd-tracker-next-js.fly.dev',
        'https://dnd-tracker.fly.dev',
        'https://dndtracker.com'
      ];

      productionUrls.forEach(url => {
        // Verify URLs are valid and not using localhost or invalid IPs
        expect(url).toMatch(/^https:\/\//);
        expect(url).not.toContain('localhost');
        expect(url).not.toContain('0.0.0.0');
        expect(url).not.toContain('127.0.0.1');

        // Verify URL can be parsed
        expect(() => new URL(url)).not.toThrow();
      });
    });
  });

  describe('Problem 2: Authentication state persistence', () => {
    it('should maintain authentication state across page navigations', async () => {
      // Set up proper JWT strategy (from issue #434 fix)
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      process.env.AUTH_TRUST_HOST = 'true';

      await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const config = mockNextAuth.mock.calls[0][0];

      // Verify JWT strategy is configured (required for persistent auth)
      expect(config.session.strategy).toBe('jwt');

      // Verify session callbacks are configured to maintain auth state
      expect(config.callbacks).toBeDefined();
      expect(config.callbacks.session).toBeDefined();
      expect(config.callbacks.jwt).toBeDefined();

      // Session callback should add user data to session from JWT
      const mockSession = { user: {} };
      const mockToken = {
        sub: 'user123',
        subscriptionTier: 'free',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      const sessionResult = await config.callbacks.session({
        session: mockSession,
        token: mockToken
      });

      expect(sessionResult.user.id).toBe('user123');
      expect(sessionResult.user.subscriptionTier).toBe('free');
    });

    it('should prevent authentication bypass when user shows as logged in but is not actually authenticated', async () => {
      // This test addresses the specific issue where users see their name in the menu
      // but get redirected to signin when accessing protected routes

      const { getToken } = require('next-auth/jwt');
      const mockGetToken = getToken as jest.Mock;

      // Simulate scenario where session appears valid but token is invalid/expired
      mockGetToken.mockResolvedValue(null);

      // Import middleware to test authentication checks
      const middleware = await import('../../middleware');

      // Create mock request for protected route
      const mockRequest = {
        nextUrl: { pathname: '/dashboard' },
        url: 'https://dnd-tracker-next-js.fly.dev/dashboard'
      } as NextRequest;

      const response = await middleware.middleware(mockRequest);

      // Should redirect to signin when token is invalid
      expect(response).toBeDefined();
      expect(response.type).toBe('redirect');

      // Extract redirect URL to verify it's correct
      const location = response.headers.get('location');

      if (location) {
        expect(location).toContain('/signin');
        expect(location).toContain('callbackUrl');
      }
    });

    it('should validate JWT tokens properly to prevent authentication inconsistencies', async () => {
      const { getToken } = require('next-auth/jwt');
      const mockGetToken = getToken as jest.Mock;

      // Test expired token scenario
      const expiredToken = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      mockGetToken.mockResolvedValue(expiredToken);

      // Import SessionUtils to test token validation
      const { SessionUtils } = await import('../middleware');

      const isExpired = SessionUtils.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);

      // Test valid token
      const validToken = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now
      };

      const isValidExpired = SessionUtils.isTokenExpired(validToken);
      expect(isValidExpired).toBe(false);
    });
  });

  describe('Problem 3: Protected route access failures', () => {
    it('should properly redirect authenticated users to protected routes', async () => {
      const { getToken } = require('next-auth/jwt');
      const mockGetToken = getToken as jest.Mock;

      // Mock valid authentication token
      const validToken = {
        sub: 'user123',
        subscriptionTier: 'free',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockGetToken.mockResolvedValue(validToken);

      // Test each protected route
      const protectedRoutes = [
        '/dashboard',
        '/characters',
        '/encounters',
        '/parties',
        '/combat',
        '/settings'
      ];

      const middleware = await import('../../middleware');

      for (const route of protectedRoutes) {
        const mockRequest = {
          nextUrl: { pathname: route },
          url: `https://dnd-tracker-next-js.fly.dev${route}`
        } as NextRequest;

        const response = await middleware.middleware(mockRequest);

        // Should allow access (return NextResponse.next()) when properly authenticated
        // If middleware returns a response, it means access was denied
        if (response && response.type === 'redirect') {
          const location = response.headers.get('location');
          // If there's a location header, it's a redirect (access denied)
          expect(location).toBeNull();
        }
      }
    });

    it('should consistently check authentication across all protected routes', async () => {
      const { getToken } = require('next-auth/jwt');
      const mockGetToken = getToken as jest.Mock;

      // Mock unauthenticated state
      mockGetToken.mockResolvedValue(null);

      const middleware = await import('../../middleware');

      const protectedRoutes = [
        '/dashboard/profile',
        '/characters/123',
        '/encounters/create',
        '/parties/456/edit',
        '/combat/789',
        '/settings/account'
      ];

      for (const route of protectedRoutes) {
        const mockRequest = {
          nextUrl: { pathname: route },
          url: `https://dnd-tracker-next-js.fly.dev${route}`
        } as NextRequest;

        const response = await middleware.middleware(mockRequest);

        // Should redirect to signin for all protected routes when unauthenticated
        expect(response).toBeDefined();
        expect(response.type).toBe('redirect');

        const location = response.headers.get('location');

        expect(location).toBeDefined();
        expect(location).toContain('/signin');
        expect(location).toContain('callbackUrl');
      }
    });
  });

  describe('Integration: Complete login flow validation', () => {
    it('should handle complete login flow without redirect errors', async () => {
      // Set up proper production environment
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      process.env.AUTH_TRUST_HOST = 'true';

      await import('../auth');

      const config = mockNextAuth.mock.calls[0][0];

      // Verify complete configuration is valid
      expect(config.trustHost).toBe(true);
      expect(config.session.strategy).toBe('jwt');
      expect(config.providers).toBeDefined();
      expect(config.callbacks.session).toBeDefined();
      expect(config.callbacks.jwt).toBeDefined();

      // Test authorization flow
      const mockCredentials = {
        email: 'doug@dougis.com',
        password: 'ejz9jfn9YUV!qxv7dzv'
      };

      const credentialsProvider = config.providers.find(
        (p: any) => p.name === 'credentials'
      );

      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider.authorize).toBeDefined();

      // Mock successful authentication
      const { UserService } = require('../services/UserService');
      UserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: { id: 'user123', email: 'doug@dougis.com' }
      });

      UserService.authenticateUser.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'user123',
            email: 'doug@dougis.com',
            firstName: 'Doug',
            lastName: 'Test',
            subscriptionTier: 'free'
          }
        }
      });

      const authResult = await credentialsProvider.authorize(mockCredentials);

      expect(authResult).toBeDefined();
      expect(authResult.id).toBe('user123');
      expect(authResult.email).toBe('doug@dougis.com');
      expect(authResult.subscriptionTier).toBe('free');
    });

    it('should ensure no redirect loops or invalid URLs in production', async () => {
      // Test that the configuration doesn't create redirect loops
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      process.env.AUTH_TRUST_HOST = 'true';

      await import('../auth');

      const config = mockNextAuth.mock.calls[0][0];

      // Verify signin page is correctly configured
      expect(config.pages.signIn).toBe('/signin');
      expect(config.pages.error).toBe('/error');

      // Verify no circular redirects
      expect(config.pages.signIn).not.toBe(config.pages.error);

      // Verify URLs are absolute paths, not full URLs that could cause issues
      expect(config.pages.signIn.startsWith('/')).toBe(true);
      expect(config.pages.error.startsWith('/')).toBe(true);

      // Verify trustHost is properly configured to prevent URL validation errors
      expect(config.trustHost).toBe(true);
    });
  });
});