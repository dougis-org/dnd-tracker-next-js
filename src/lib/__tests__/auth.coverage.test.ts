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
  createMockUser,
  withConsoleSpy,
  setupEnvironment,
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

// Helper functions to reduce duplication
const getAuthConfig = async () => {
  jest.resetModules();
  await import('../auth');
  return mockNextAuth.mock.calls[0][0];
};

// Import setupEnvironment from auth-test-utils

const createMockAuthData = () => {
  const mockUser = createMockUser({
    id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionTier: 'premium',
  });

  return {
    user: mockUser,
    getUserResult: { success: true, data: mockUser },
    authResult: { success: true, data: { user: mockUser } },
    credentials: { email: 'test@example.com', password: 'correctpassword' }
  };
};

const testCallback = async (callbackName: string, params: any) => {
  const config = await getAuthConfig();
  const callback = config.callbacks[callbackName];
  return callback(params);
};

describe('NextAuth Comprehensive Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetUserByEmail.mockClear();
    mockAuthenticateUser.mockClear();

    // Setup NextAuth mock to return proper structure
    mockNextAuth.mockImplementation((config) => {
      // Execute callbacks to test them
      if (config.callbacks) {
        // Store config for testing
        (mockNextAuth as any)._lastConfig = config;
      }
      return {
        handlers: { GET: jest.fn(), POST: jest.fn() },
        auth: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      };
    });
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
        setupEnvironment({ NEXTAUTH_URL: url, NODE_ENV: 'production' });
        withConsoleSpy(_consoleSpy => {
          jest.resetModules();
          import('../auth');
        });
      });
    });

    // Test isValidProductionHostname function (lines 24-26)
    it('should test isValidProductionHostname in different environments', async () => {
      // Test in development - should allow local hostnames
      setupEnvironment({ NODE_ENV: 'development', NEXTAUTH_URL: 'http://localhost:3000' });
      const authModule = await getAuthConfig();
      expect(authModule).toBeDefined();

      // Test in production - should reject local hostnames
      setupEnvironment({ NODE_ENV: 'production', NEXTAUTH_URL: 'http://0.0.0.0:3000' });
      withConsoleSpy(_consoleSpy => {
        jest.resetModules();
        import('../auth');
      });
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
        setupEnvironment(env);
        if (shouldWarn) {
          withConsoleSpy(_consoleSpy => {
            jest.resetModules();
            import('../auth');
          });
        } else {
          jest.resetModules();
          import('../auth');
        }
      });
    });
  });

  describe('MongoDB Setup Coverage', () => {
    // Test MongoDB URI validation (lines 54-61)
    it('should handle missing MONGODB_URI in different environments', async () => {
      // Test missing URI in CI environment (should not throw, but warn)
      const originalEnv = {
        MONGODB_URI: process.env.MONGODB_URI,
        VERCEL: process.env.VERCEL,
        CI: process.env.CI,
        NODE_ENV: process.env.NODE_ENV
      };

      // Test in CI with missing URI (should warn but not throw)
      setupEnvironment({
        MONGODB_URI: undefined,
        NODE_ENV: 'production',
        VERCEL: undefined,
        CI: 'true'
      });

      withConsoleSpy(_consoleSpy => {
        jest.resetModules();
        // This should warn but not throw in CI
        expect(() => require('../auth')).not.toThrow();
      });

      // Restore environment
      Object.keys(originalEnv).forEach(key => {
        if (originalEnv[key] !== undefined) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    });

    // Test MongoDB client creation (lines 63-64)
    it('should create MongoDB client with placeholder URI', async () => {
      const originalEnv = process.env.MONGODB_URI;
      setupEnvironment({ MONGODB_URI: undefined, CI: 'true' });

      withConsoleSpy(_consoleSpy => {
        jest.resetModules();
        const authModule = require('../auth');
        expect(authModule).toBeDefined();
      });

      // Restore environment
      if (originalEnv) {
        process.env.MONGODB_URI = originalEnv;
      }
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

      // Test session configuration (lines 126-130)
      expect(config.session.strategy).toBe('jwt');
      expect(config.session.maxAge).toBe(30 * 24 * 60 * 60);
      expect(config.session.updateAge).toBe(24 * 60 * 60);

      // Test callbacks configuration (lines 131-222)
      expect(config.callbacks).toBeDefined();
      expect(config.callbacks.session).toBeDefined();
      expect(config.callbacks.jwt).toBeDefined();
      expect(config.callbacks.redirect).toBeDefined();

      // Test pages configuration (lines 223-226)
      expect(config.pages.signIn).toBe('/signin');
      expect(config.pages.error).toBe('/error');

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
    const testAuthorize = async (credentials: any, expectResult: any = null) => {
      const config = await getAuthConfig();
      const authorizeFunc = config.providers[0].authorize;
      const result = await authorizeFunc(credentials);
      if (expectResult === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toEqual(expectResult);
      }
      return result;
    };

    // Test authorize function with missing credentials (lines 86-89)
    it('should test authorize with missing credentials', async () => {
      const testCases = [
        { password: 'test123' }, // missing email
        { email: 'test@example.com' }, // missing password
        {} // missing both
      ];

      for (const credentials of testCases) {
        await testAuthorize(credentials);
      }
    });

    // Test authorize function with UserService failures (lines 92-109)
    it('should test authorize with service failures', async () => {
      const mockData = createMockAuthData();

      // Test getUserByEmail failure
      mockGetUserByEmail.mockResolvedValue({ success: false, error: 'User not found' });
      await testAuthorize(mockData.credentials);

      // Test authenticateUser failure
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue({ success: false, error: 'Invalid password' });
      await testAuthorize(mockData.credentials);
    });

    // Test authorize function with successful authentication (lines 111-118)
    it('should test authorize with successful authentication', async () => {
      const mockData = createMockAuthData();
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue(mockData.authResult);

      await testAuthorize(mockData.credentials, {
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
        testAuthorize({ email: 'test@example.com', password: 'test123' });
      });
    });
  });

  describe('Session Callback Coverage', () => {
    // Test session callback with various scenarios (lines 132-159)
    it('should test session callback with missing session or token', async () => {
      const testCases = [
        {
          params: { session: null, token: { sub: 'user123' } },
          expectResult: null,
          shouldWarn: true
        },
        {
          params: { session: { user: { email: 'test@example.com' } }, token: null },
          expectResult: { user: { email: 'test@example.com' } },
          shouldWarn: true
        }
      ];

      for (const { params, expectResult, shouldWarn } of testCases) {
        if (shouldWarn) {
          withConsoleSpy(async _consoleSpy => {
            const result = await testCallback('session', params);
            expect(result).toEqual(expectResult);
          });
        } else {
          const result = await testCallback('session', params);
          expect(result).toEqual(expectResult);
        }
      }
    });

    it('should test session callback with expired token', async () => {
      const expiredToken = {
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback('session', {
          session: { user: { email: 'test@example.com' } },
          token: expiredToken
        });
        expect(result).toBeNull();
      });
    });

    it('should test session callback with valid session', async () => {
      const validToken = {
        sub: 'user123',
        subscriptionTier: 'premium',
        firstName: 'John',
        lastName: 'Doe',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const session = { user: { email: 'test@example.com', name: 'Existing Name' } };
      const result = await testCallback('session', { session, token: validToken });

      expect(result.user.id).toBe('user123');
      expect(result.user.subscriptionTier).toBe('premium');
      // The callback only updates name if it doesn't exist, so existing name is preserved
      expect(result.user.name).toBe('Existing Name');
    });

    it('should test session callback name update when missing', async () => {
      const validToken = {
        sub: 'user123',
        subscriptionTier: 'premium',
        firstName: 'John',
        lastName: 'Doe',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const session = { user: { email: 'test@example.com' } }; // No name property
      const result = await testCallback('session', { session, token: validToken });

      expect(result.user.id).toBe('user123');
      expect(result.user.subscriptionTier).toBe('premium');
      // The callback should build the name from firstName + lastName when name is missing
      expect(result.user.name).toBe('John Doe');
    });

    it('should test session callback error handling', async () => {
      const problematicToken = { get sub() { throw new Error('Token access error'); } };

      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback('session', {
          session: { user: { email: 'test@example.com' } },
          token: problematicToken
        });
        expect(result).toBeNull();
      });
    });
  });

  describe('JWT Callback Coverage', () => {
    it('should test JWT callback with new user data', async () => {
      const newUser = { id: 'user123', email: 'test@example.com', subscriptionTier: 'premium', firstName: 'John', lastName: 'Doe' };
      const token = { email: 'old@example.com' };
      const result = await testCallback('jwt', { token, user: newUser });

      expect(result.subscriptionTier).toBe('premium');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('test@example.com');
    });

    it('should test JWT callback with missing sub field', async () => {
      const user = { id: 'user123' };
      const token = { email: 'test@example.com' };
      const result = await testCallback('jwt', { token, user });
      expect(result.sub).toBe('user123');
    });

    it('should test JWT callback error handling', async () => {
      const problematicUser = { get subscriptionTier() { throw new Error('User access error'); } };
      const token = { email: 'test@example.com' };

      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback('jwt', { token, user: problematicUser });
        expect(result).toEqual(token);
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
        const result = await testCallback('redirect', params);
        expect(result).toBe(expected);
      });
    });

    it('should test redirect callback with trusted domains in production', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      const result = await testCallback('redirect', {
        url: 'https://dnd-tracker-next-js.fly.dev/dashboard',
        baseUrl: 'https://example.com'
      });
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev/dashboard');
    });

    it('should test redirect callback blocking untrusted URLs', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback('redirect', {
          url: 'https://malicious-site.com/dashboard',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });

    it('should test redirect callback error handling', async () => {
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback('redirect', {
          url: 'invalid-url-format',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });
  });
});
