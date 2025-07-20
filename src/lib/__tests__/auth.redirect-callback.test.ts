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
  withConsoleSpy,
  setupCommonAuthTestMocks,
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

// Helper functions to reduce duplication
const getAuthConfigAsync = async () => {
  jest.resetModules();
  await import('../auth');
  return mockNextAuth.mock.calls[0][0];
};

const testCallback = async (callbackName: string, params: any) => {
  const config = await getAuthConfigAsync();
  const callback = config.callbacks[callbackName];
  return callback(params);
};

describe('Redirect Callback Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
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

    it('should test redirect callback with relative URLs', async () => {
      const testCases = [
        { url: '/profile', baseUrl: 'https://example.com', expected: 'https://example.com/profile' },
        { url: '/settings/account', baseUrl: 'https://example.com', expected: 'https://example.com/settings/account' },
        { url: '/', baseUrl: 'https://example.com', expected: 'https://example.com/' }
      ];

      for (const { url, baseUrl, expected } of testCases) {
        const result = await testCallback('redirect', { url, baseUrl });
        expect(result).toBe(expected);
      }
    });

    it('should test redirect callback with query parameters', async () => {
      const testCases = [
        { url: '/dashboard?tab=characters', baseUrl: 'https://example.com', expected: 'https://example.com/dashboard?tab=characters' },
        { url: '/encounter/123?edit=true', baseUrl: 'https://example.com', expected: 'https://example.com/encounter/123?edit=true' }
      ];

      for (const { url, baseUrl, expected } of testCases) {
        const result = await testCallback('redirect', { url, baseUrl });
        expect(result).toBe(expected);
      }
    });

    it('should test redirect callback with different environments', async () => {
      const environments = ['development', 'production', 'test'];

      for (const env of environments) {
        setupEnvironment({ NODE_ENV: env });
        const result = await testCallback('redirect', {
          url: '/dashboard',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com/dashboard');
      }
    });

    it('should test redirect callback with edge cases', async () => {
      const edgeCases = [
        { url: '', baseUrl: 'https://example.com', description: 'empty URL' },
        { url: null, baseUrl: 'https://example.com', description: 'null URL' },
        { url: undefined, baseUrl: 'https://example.com', description: 'undefined URL' },
        { url: '/dashboard', baseUrl: '', description: 'empty baseUrl' },
        { url: '/dashboard', baseUrl: null, description: 'null baseUrl' },
        { url: '/dashboard', baseUrl: undefined, description: 'undefined baseUrl' }
      ];

      for (const { url, baseUrl, _description } of edgeCases) {
        withConsoleSpy(async _consoleSpy => {
          const result = await testCallback('redirect', { url, baseUrl });
          expect(result).toBeDefined(); // Should handle gracefully
        });
      }
    });
  });
});