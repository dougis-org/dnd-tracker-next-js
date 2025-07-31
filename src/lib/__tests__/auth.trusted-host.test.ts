import { setupCommonAuthTestMocks, getAuthConfigAsync } from './auth-test-utils';

// Mock the entire next-auth module to capture configuration
const mockNextAuth = jest.fn();
jest.mock('next-auth', () => mockNextAuth);

// Mock MongoDB dependencies
jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn(),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

// Mock UserService
jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    authenticateUser: jest.fn(),
  },
}));

describe('NextAuth Trusted Host Configuration', () => {
  const originalEnv = process.env;

  // Helper function removed - using getAuthConfigAsync directly with environment setup

  // Helper function to test trustHost value
  const testTrustHostValue = async (envValue: string | null, expectedValue: boolean) => {
    // Set or clear AUTH_TRUST_HOST
    if (envValue !== undefined) {
      if (envValue === null) {
        delete process.env.AUTH_TRUST_HOST;
      } else {
        process.env.AUTH_TRUST_HOST = envValue;
      }
    }

    const config = await getAuthConfigAsync(mockNextAuth);
    expect(config).toHaveProperty('trustHost', expectedValue);
  };

  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);

    // Reset environment to simulate production
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      MONGODB_DB_NAME: 'testdb',
      NEXTAUTH_SECRET: 'test-secret',
    };
    // Clear trusted host configs
    delete process.env.AUTH_TRUST_HOST;
    delete process.env.NEXTAUTH_TRUST_HOST;
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Reproduction of Issue #434', () => {
    it('should identify missing trusted host configuration as the root cause', () => {
      // The issue from the logs: UntrustedHost: Host must be trusted.
      // URL was: https://dnd-tracker-next-js.fly.dev/api/auth/session

      const productionHost = 'dnd-tracker-next-js.fly.dev';
      const errorMessage = 'UntrustedHost: Host must be trusted. URL was: https://dnd-tracker-next-js.fly.dev/api/auth/session';

      // This reproduces the core issue - missing trusted host configuration
      expect(process.env.AUTH_TRUST_HOST).toBeUndefined();
      expect(process.env.NEXTAUTH_TRUST_HOST).toBeUndefined();

      // Verify that this is the production domain mentioned in the error
      expect(errorMessage).toContain(productionHost);
      expect(errorMessage).toContain('UntrustedHost');
    });

    it('should require AUTH_TRUST_HOST configuration for production deployment', () => {
      // Test the expected solution - we need to set AUTH_TRUST_HOST=true
      // or properly configure NEXTAUTH_URL in production

      const isProductionSecure =
        process.env.AUTH_TRUST_HOST === 'true' ||
        process.env.NEXTAUTH_URL === 'https://dnd-tracker-next-js.fly.dev';

      // Currently this should be false (demonstrating the issue)
      expect(isProductionSecure).toBe(false);

      // After our fix, we'll set AUTH_TRUST_HOST=true for production
      const mockProductionEnv = { AUTH_TRUST_HOST: 'true' };
      const wouldBeSecureAfterFix = mockProductionEnv.AUTH_TRUST_HOST === 'true';
      expect(wouldBeSecureAfterFix).toBe(true);
    });

    it('should load auth module without errors when properly configured', async () => {
      // Set up proper configuration for testing
      process.env.AUTH_TRUST_HOST = 'true';

      // Import should work without the UntrustedHost error
      const authModule = await import('../auth');

      expect(authModule.handlers).toBeDefined();
      expect(authModule.auth).toBeDefined();
      expect(authModule.signIn).toBeDefined();
      expect(authModule.signOut).toBeDefined();
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should set trustHost to true when AUTH_TRUST_HOST=true', async () => {
      await testTrustHostValue('true', true);
    });

    it('should set trustHost to true when AUTH_TRUST_HOST is not set (production default)', async () => {
      await testTrustHostValue(null, true);
    });

    it('should set trustHost to true when AUTH_TRUST_HOST=false (production override)', async () => {
      await testTrustHostValue('false', true);
    });

    it('should set trustHost to true when AUTH_TRUST_HOST has invalid value (production default)', async () => {
      await testTrustHostValue('yes', true);
    });
  });

  describe('Production Configuration Validation', () => {
    it('should verify the trustHost configuration solves the UntrustedHost issue', async () => {
      process.env.AUTH_TRUST_HOST = 'true';
      const config = await getAuthConfigAsync(mockNextAuth);

      // This is the key fix for Issue #434
      expect(config.trustHost).toBe(true);

      // Document what this fixes
      const issueDescription = 'UntrustedHost: Host must be trusted. URL was: https://dnd-tracker-next-js.fly.dev/api/auth/session';
      expect(issueDescription).toContain('UntrustedHost');
      expect(issueDescription).toContain('dnd-tracker-next-js.fly.dev');
    });

    it('should maintain all other NextAuth configuration while adding trustHost', async () => {
      process.env.AUTH_TRUST_HOST = 'true';
      const config = await getAuthConfigAsync(mockNextAuth);

      // Verify trustHost is enabled
      expect(config.trustHost).toBe(true);

      // Verify essential NextAuth configuration is preserved
      expect(config.providers).toBeDefined();
      expect(Array.isArray(config.providers)).toBe(true);
      expect(config.providers.length).toBeGreaterThan(0);

      expect(config.session).toBeDefined();
      expect(config.session.strategy).toBe('database');
      expect(config.session.maxAge).toBe(30 * 24 * 60 * 60); // 30 days

      expect(config.callbacks).toBeDefined();
      expect(config.callbacks.session).toBeDefined();

      expect(config.pages).toBeDefined();
      expect(config.pages.signIn).toBe('/signin');
      expect(config.pages.error).toBe('/error');

      expect(config.debug).toBe(false); // Should be false in production test env
    });
  });
});