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
  setupCommonAuthTestMocks,
  testAuthWithEnvAndSpy,
  testEnvWithConditionalImport,
  setupEnvironment,
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

describe('NextAuth Helper Functions Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
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
      jest.resetModules();
      const authModule = await import('../auth');
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

    // Test validateMongoDbUri function - Issue #480
    it('should validate MONGODB_URI in non-production environments', async () => {
      // Test production environment - should not validate
      setupEnvironment({ NODE_ENV: 'production', MONGODB_URI: undefined });
      jest.resetModules();
      const authModule = await import('../auth');
      expect(authModule).toBeDefined();

      // Test CI environment - should not validate (even in test/dev mode)
      setupEnvironment({ NODE_ENV: 'test', MONGODB_URI: undefined, CI: 'true' });
      jest.resetModules();
      const authModuleCI = await import('../auth');
      expect(authModuleCI).toBeDefined();

      // Test development environment without MONGODB_URI - should throw
      expect(() => {
        setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: undefined, CI: undefined });
        jest.resetModules();
        require('../auth');
      }).toThrow('MONGODB_URI environment variable is required in non-production environments. Please set MONGODB_URI in your .env.local file for development.');

      // Test test environment without MONGODB_URI (non-CI) - should throw
      expect(() => {
        setupEnvironment({ NODE_ENV: 'test', MONGODB_URI: undefined, CI: undefined });
        jest.resetModules();
        require('../auth');
      }).toThrow('MONGODB_URI environment variable is required in non-production environments. Please set MONGODB_URI in your .env.local file for development.');

      // Test with invalid MONGODB_URI format - should throw
      expect(() => {
        setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'invalid-uri-format', CI: undefined });
        jest.resetModules();
        require('../auth');
      }).toThrow('MONGODB_URI must be a valid MongoDB connection string, e.g. mongodb://user:pass@host:port/db or mongodb+srv://host/db');

      // Test with valid MONGODB_URI - should not throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'mongodb://localhost:27017/test' });
      jest.resetModules();
      const authModuleValid = await import('../auth');
      expect(authModuleValid).toBeDefined();

      // Test with valid mongodb+srv URI - should not throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/test' });
      jest.resetModules();
      const authModuleSrv = await import('../auth');
      expect(authModuleSrv).toBeDefined();
    });

    // Direct unit tests for validateMongoDbUri function - Issue #480
    it('should test validateMongoDbUri function directly', async () => {
      // Import function in a clean environment
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'mongodb://localhost:27017/test' });
      jest.resetModules();
      const { validateMongoDbUri } = await import('../auth');

      // Test production environment - should not throw
      setupEnvironment({ NODE_ENV: 'production', MONGODB_URI: undefined });
      expect(() => validateMongoDbUri()).not.toThrow();

      // Test CI environment - should not throw
      setupEnvironment({ NODE_ENV: 'test', MONGODB_URI: undefined, CI: 'true' });
      expect(() => validateMongoDbUri()).not.toThrow();

      // Test development environment without MONGODB_URI (non-CI) - should throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: undefined, CI: undefined });
      expect(() => validateMongoDbUri()).toThrow('MONGODB_URI environment variable is required in non-production environments. Please set MONGODB_URI in your .env.local file for development.');

      // Test development environment with invalid format - should throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'invalid-format', CI: undefined });
      expect(() => validateMongoDbUri()).toThrow('MONGODB_URI must be a valid MongoDB connection string, e.g. mongodb://user:pass@host:port/db or mongodb+srv://host/db');

      // Test development environment with valid mongodb:// format - should not throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'mongodb://localhost:27017/test' });
      expect(() => validateMongoDbUri()).not.toThrow();

      // Test development environment with valid mongodb+srv:// format - should not throw
      setupEnvironment({ NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/test' });
      expect(() => validateMongoDbUri()).not.toThrow();

      // Test test environment (non-CI) - should validate like development
      setupEnvironment({ NODE_ENV: 'test', MONGODB_URI: undefined, CI: undefined });
      expect(() => validateMongoDbUri()).toThrow('MONGODB_URI environment variable is required in non-production environments. Please set MONGODB_URI in your .env.local file for development.');
    });
  });
});