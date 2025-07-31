import {
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import {
  setupAuthTestEnv,
  restoreAuthTestEnv,
  authTestAssertions,
  withConsoleSpy,
  setupEnvironment,
  setupCommonAuthTestMocks,
  testAuthWithEnvAndSpy,
  testEnvWithConditionalImport,
  testWithTemporaryEnv,
  testCallbackWithSpy,
  getAuthConfigAsync,
  createMockAuthData,
  testAuthorize,
  testCallback,
} from './auth-test-utils';

// Mock dependencies before importing
const mockGetUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockAuthenticateUser = jest.fn() as jest.MockedFunction<any>;
const mockNextAuth = jest.fn();

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: mockGetUserByEmail,
    authenticateUser: mockAuthenticateUser,
  },
}));

jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn().mockReturnValue({}),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('next-auth', () => mockNextAuth);

let originalEnv: NodeJS.ProcessEnv;

beforeAll(() => {
  originalEnv = setupAuthTestEnv();
});

afterAll(() => {
  restoreAuthTestEnv(originalEnv);
});

// Helper functions now imported from auth-test-utils

describe('NextAuth Comprehensive Coverage Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
    // Setup additional mocks for coverage tests
    if (mockGetUserByEmail) {
      mockGetUserByEmail.mockClear();
    }
    if (mockAuthenticateUser) {
      mockAuthenticateUser.mockClear();
    }
  });

  describe('Helper Functions Coverage', () => {
    // Test isLocalHostname function (lines 10-19)
    it('should test isLocalHostname function with all local addresses', async () => {
      const localUrls = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://192.168.1.100:3000',
        'http://10.0.0.1:3000',
        'http://172.16.0.1:3000'
      ];

      localUrls.forEach(url => {
        testAuthWithEnvAndSpy({ NEXTAUTH_URL: url, NODE_ENV: 'production' });
      });
    });

    // Test isValidProductionHostname function (lines 24-26)
    it('should test isValidProductionHostname in different environments', async () => {
      // Test in development - should allow local hostnames
      setupEnvironment({ NODE_ENV: 'development', NEXTAUTH_URL: 'http://localhost:3000' });
      const authModule = await getAuthConfigAsync(mockNextAuth);
      expect(authModule).toBeDefined();

      // Test in production - should reject local hostnames
      testAuthWithEnvAndSpy({ NODE_ENV: 'production', NEXTAUTH_URL: 'http://0.0.0.0:3000' });
    });

    // Test validateNextAuthUrl function (lines 32-52)
    it('should test validateNextAuthUrl with various URL formats', async () => {
      const testCases = [
        { env: { NEXTAUTH_URL: undefined }, shouldWarn: false },
        { env: { NEXTAUTH_URL: 'https://dnd-tracker-next-js.fly.dev', NODE_ENV: 'production' }, shouldWarn: false },
        { env: { NEXTAUTH_URL: 'invalid-url-format' }, shouldWarn: true },
        { env: { NEXTAUTH_URL: 'http://[invalid' }, shouldWarn: true }
      ];

      testCases.forEach(({ env, shouldWarn }) => {
        testEnvWithConditionalImport(env, shouldWarn);
      });
    });
  });

  describe('MongoDB Setup Coverage', () => {
    // Test MongoDB URI validation (lines 54-61)
    it('should handle missing MONGODB_URI in different environments', async () => {
      testWithTemporaryEnv(
        ['MONGODB_URI', 'VERCEL', 'CI', 'NODE_ENV'],
        {
          MONGODB_URI: undefined,
          NODE_ENV: 'production',
          VERCEL: undefined,
          CI: 'true'
        },
        () => {
          withConsoleSpy(_consoleSpy => {
            jest.resetModules();
            // This should warn but not throw in CI
            expect(() => require('../auth')).not.toThrow();
          });
        }
      );
    });

    // Test MongoDB client creation (lines 63-64)
    it('should create MongoDB client with placeholder URI', async () => {
      testWithTemporaryEnv(
        ['MONGODB_URI'],
        { MONGODB_URI: undefined, CI: 'true' },
        () => {
          withConsoleSpy(_consoleSpy => {
            jest.resetModules();
            const authModule = require('../auth');
            expect(authModule).toBeDefined();
          });
        }
      );
    });
  });

  describe('NextAuth Configuration Coverage', () => {
    // Test NextAuth configuration execution (lines 69-228)
    it('should test complete NextAuth configuration', async () => {
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      process.env.NODE_ENV = 'production';
      process.env.AUTH_TRUST_HOST = 'true';
      process.env.MONGODB_DB_NAME = 'testdb';

      jest.resetModules();
      const authModule = await import('../auth');

      expect(mockNextAuth).toHaveBeenCalledTimes(1);
      const config = mockNextAuth.mock.calls[0][0];

      // Test adapter configuration
      expect(config.adapter).toBeDefined();

      // Test trustHost configuration (lines 74-75)
      expect(config.trustHost).toBe(true);

      // Test URL configuration (lines 77-78)
      expect(config.url).toBeDefined();

      // Test providers configuration (lines 79-125)
      expect(config.providers).toBeDefined();
      expect(config.providers[0].name).toBe('credentials');

      // Test debug configuration (line 227)
      expect(config.debug).toBe(false);

      authTestAssertions.expectModuleExports(authModule);
    });

    it('should test NextAuth configuration in development', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const authModule = await import('../auth');

      const config = mockNextAuth.mock.calls[0][0];
      expect(config.debug).toBe(true);
      authTestAssertions.expectModuleExports(authModule);
    });
  });

  describe('Authorize Function Coverage', () => {
    // Using imported testAuthorize helper

    // Test authorize function with missing credentials (lines 86-89)
    it('should test authorize with missing credentials', async () => {
      const testCases = [
        { password: 'test123' }, // missing email
        { email: 'test@example.com' }, // missing password
        {} // missing both
      ];

      for (const credentials of testCases) {
        await testAuthorize(mockNextAuth, credentials);
      }
    });

    // Test authorize function with UserService failures (lines 92-109)
    it('should test authorize with service failures', async () => {
      const mockData = createMockAuthData();

      // Test getUserByEmail failure
      mockGetUserByEmail.mockResolvedValue({ success: false, error: 'User not found' });
      await testAuthorize(mockNextAuth, mockData.credentials);

      // Test authenticateUser failure
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue({ success: false, error: 'Invalid password' });
      await testAuthorize(mockNextAuth, mockData.credentials);
    });

    // Test authorize function with successful authentication (lines 111-118)
    it('should test authorize with successful authentication', async () => {
      const mockData = createMockAuthData();
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue(mockData.authResult);

      await testAuthorize(mockNextAuth, mockData.credentials, {
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        subscriptionTier: 'premium',
      });
    });

    // Test authorize function with error handling (lines 119-123)
    it('should test authorize with error handling', async () => {
      mockGetUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      withConsoleSpy(_consoleSpy => {
        testAuthorize(mockNextAuth, { email: 'test@example.com', password: 'test123' });
      });
    });
  });

  describe('Redirect Callback Coverage', () => {
    it('should test redirect callback with various URL scenarios', async () => {
      const testCases = [
        { params: { url: '/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' },
        { params: { url: 'https://example.com/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' }
      ];

      testCases.forEach(async ({ params, expected }) => {
        const result = await testCallback(mockNextAuth, 'redirect', params);
        expect(result).toBe(expected);
      });
    });

    it('should test redirect callback with trusted domains in production', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      const result = await testCallback(mockNextAuth, 'redirect', {
        url: 'https://dnd-tracker-next-js.fly.dev/dashboard',
        baseUrl: 'https://example.com'
      });
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev/dashboard');
    });

    it('should test redirect callback blocking untrusted URLs', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback(mockNextAuth, 'redirect', {
          url: 'https://malicious-site.com/dashboard',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });

    it('should test redirect callback error handling', async () => {
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback(mockNextAuth, 'redirect', {
          url: 'invalid-url-format',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });
  });
});
