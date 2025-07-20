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
  testWithTemporaryEnv,
  withConsoleSpy,
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

describe('MongoDB Setup Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
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

    it('should handle MONGODB_URI in different deployment environments', async () => {
      const testCases = [
        {
          env: { MONGODB_URI: 'mongodb://localhost:27017/test', NODE_ENV: 'development' },
          description: 'development with local MongoDB'
        },
        {
          env: { MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod', NODE_ENV: 'production' },
          description: 'production with MongoDB Atlas'
        },
        {
          env: { MONGODB_URI: undefined, CI: 'true', NODE_ENV: 'test' },
          description: 'CI environment without MongoDB'
        }
      ];

      testCases.forEach(({ env, _description }) => {
        testWithTemporaryEnv(
          ['MONGODB_URI', 'NODE_ENV', 'CI'],
          env,
          () => {
            withConsoleSpy(_consoleSpy => {
              jest.resetModules();
              expect(() => require('../auth')).not.toThrow();
            });
          }
        );
      });
    });
  });
});