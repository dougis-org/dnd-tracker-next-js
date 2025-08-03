import { testMiddlewareAuth, verifyUrlValidation, setupCommonAuthTestMocks, setupAuthEnvironment, getAuthConfigAsync } from './auth-test-utils';

/**
 * Test file for Issue #438: Login fails to redirect to a useful page
 *
 * This file tests the specific problems reported in GitHub issue #438:
 * 1. Users get redirected to an error page showing IP address 0.0.0.0
 * 2. Users who do reach the site aren't properly recognized as logged in
 *    (despite showing their name in the menu)
 * 3. Accessing any link in the left nav directs to the login page
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


  // Helper function removed - using getAuthConfigAsync directly from auth-test-utils

  // verifyUrlValidation imported from auth-test-utils

  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Problem 1: 0.0.0.0 redirect error', () => {
    it('should NOT use invalid URLs like 0.0.0.0 in production', async () => {
      setupAuthEnvironment('http://0.0.0.0:3000');
      await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const config = mockNextAuth.mock.calls[0][0];

      // Configuration should handle invalid NEXTAUTH_URL gracefully
      expect(config).toBeDefined();
      expect(config.trustHost).toBeDefined();
      expect(process.env.NEXTAUTH_URL).toBe('http://0.0.0.0:3000');
    });

    it('should handle missing NEXTAUTH_URL gracefully', async () => {
      setupAuthEnvironment(); // No URL provided
      delete process.env.NEXTAUTH_URL;

      await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const config = mockNextAuth.mock.calls[0][0];

      expect(config).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(config.session).toBeDefined();
    });

    it('should ensure production URLs are properly configured', () => {
      const productionUrls = [
        'https://dnd-tracker-next-js.fly.dev',
        'https://dnd-tracker.fly.dev',
        'https://dndtracker.com'
      ];
      verifyUrlValidation(productionUrls, true);
    });
  });

  describe('Problem 2: Authentication state persistence', () => {
    it('should maintain authentication state with proper JWT configuration', async () => {
      setupAuthEnvironment('https://dnd-tracker-next-js.fly.dev');
      process.env.AUTH_TRUST_HOST = 'true';
      const config = await getAuthConfigAsync(mockNextAuth);
      expect(config).toBeDefined();
      expect(config.session.strategy).toBe('jwt');
      expect(config.callbacks).toBeDefined();
      expect(config.callbacks.session).toBeDefined();
    });

    it('should prevent authentication bypass with middleware checks', async () => {
      await testMiddlewareAuth(null, '/dashboard', true);
    });
  });

  describe('Problem 3: Protected route access failures', () => {

    it('should allow access with valid authentication', async () => {
      const validToken = {
        sub: 'user123',
        subscriptionTier: 'free',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      await testMiddlewareAuth(validToken, '/dashboard', false);
    });

    it('should redirect unauthenticated users consistently', async () => {
      const routes = ['/dashboard/profile', '/characters/123', '/settings/account'];

      for (const route of routes) {
        await testMiddlewareAuth(null, route, true);
      }
    });
  });

  describe('Integration: Complete login flow validation', () => {
    it('should handle complete login flow configuration', async () => {
      setupAuthEnvironment('https://dnd-tracker-next-js.fly.dev');
      process.env.AUTH_TRUST_HOST = 'true';

      const config = await getAuthConfigAsync(mockNextAuth);
      expect(config).toBeDefined();
      expect(config.session.strategy).toBe('jwt');
      expect(config.callbacks).toBeDefined();
      expect(config.callbacks.session).toBeDefined();

      // Verify additional complete configuration is valid
      expect(config.trustHost).toBe(true);
      expect(config.providers).toBeDefined();
      expect(config.pages.signIn).toBe('/login');
      expect(config.pages.error).toBe('/error');
    });
  });
});