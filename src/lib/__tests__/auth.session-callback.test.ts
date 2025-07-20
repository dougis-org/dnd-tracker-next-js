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
  testCallbackWithSpy,
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

describe('Session Callback Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
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
          await testCallbackWithSpy(testCallback, 'session', params, expectResult);
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

      await testCallbackWithSpy(testCallback, 'session', {
        session: { user: { email: 'test@example.com' } },
        token: expiredToken
      }, null);
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

      await testCallbackWithSpy(testCallback, 'session', {
        session: { user: { email: 'test@example.com' } },
        token: problematicToken
      }, null);
    });

    it('should test session callback with partial token data', async () => {
      const partialTokens = [
        {
          token: { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 },
          description: 'token with only sub and exp'
        },
        {
          token: { sub: 'user123', firstName: 'John', exp: Math.floor(Date.now() / 1000) + 3600 },
          description: 'token with firstName but no lastName'
        },
        {
          token: { sub: 'user123', lastName: 'Doe', exp: Math.floor(Date.now() / 1000) + 3600 },
          description: 'token with lastName but no firstName'
        }
      ];

      for (const { token, _description } of partialTokens) {
        const session = { user: { email: 'test@example.com' } };
        const result = await testCallback('session', { session, token });
        expect(result.user.id).toBe('user123');
        expect(result).toBeDefined();
      }
    });

    it('should test session callback with different subscription tiers', async () => {
      const subscriptionTiers = ['free', 'premium', 'enterprise', 'unlimited'];

      for (const tier of subscriptionTiers) {
        const validToken = {
          sub: 'user123',
          subscriptionTier: tier,
          exp: Math.floor(Date.now() / 1000) + 3600
        };

        const session = { user: { email: 'test@example.com' } };
        const result = await testCallback('session', { session, token: validToken });

        expect(result.user.subscriptionTier).toBe(tier);
        expect(result.user.id).toBe('user123');
      }
    });
  });
});