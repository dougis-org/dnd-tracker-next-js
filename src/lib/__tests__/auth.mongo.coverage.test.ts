
import {
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import {
  withConsoleSpy,
  testWithTemporaryEnv,
} from './auth-test-utils';

jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn().mockReturnValue({}),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({})),
}));

describe('Auth MongoDB Setup Coverage', () => {
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
          expect(() => require('../auth')).not.toThrow();
        });
      }
    );
  });

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
