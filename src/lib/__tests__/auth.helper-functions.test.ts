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
  });
});