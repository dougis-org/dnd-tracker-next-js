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
  setupCommonAuthTestMocks,
} from './auth-test-utils';

// Mock dependencies before importing
const mockNextAuth = jest.fn();

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    authenticateUser: jest.fn(),
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

describe('NextAuth Configuration Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
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

    it('should test NextAuth configuration with different trust host settings', async () => {
      const testCases = [
        { AUTH_TRUST_HOST: 'true', expected: true },
        { AUTH_TRUST_HOST: 'false', expected: true }, // Production automatically trusts hosts
        { AUTH_TRUST_HOST: undefined, expected: true } // Production automatically trusts hosts
      ];

      for (const { AUTH_TRUST_HOST, expected } of testCases) {
        // Clear the mock before each iteration
        mockNextAuth.mockClear();
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
        if (AUTH_TRUST_HOST !== undefined) {
          process.env.AUTH_TRUST_HOST = AUTH_TRUST_HOST;
        } else {
          delete process.env.AUTH_TRUST_HOST;
        }

        jest.resetModules();
        await import('../auth');

        const config = mockNextAuth.mock.calls[0][0];
        expect(config.trustHost).toBe(expected);
      }
    });

    it('should test NextAuth configuration with different database names', async () => {
      const testCases = [
        { MONGODB_DB_NAME: 'production_db', NODE_ENV: 'production' },
        { MONGODB_DB_NAME: 'development_db', NODE_ENV: 'development' },
        { MONGODB_DB_NAME: undefined, NODE_ENV: 'test' }
      ];

      for (const { MONGODB_DB_NAME, NODE_ENV } of testCases) {
        process.env.NODE_ENV = NODE_ENV;
        process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
        if (MONGODB_DB_NAME !== undefined) {
          process.env.MONGODB_DB_NAME = MONGODB_DB_NAME;
        } else {
          delete process.env.MONGODB_DB_NAME;
        }

        jest.resetModules();
        const authModule = await import('../auth');

        expect(mockNextAuth).toHaveBeenCalled();
        authTestAssertions.expectModuleExports(authModule);
      }
    });
  });
});