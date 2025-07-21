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
  testCallback,
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

// Helper functions now imported from auth-test-utils

describe('JWT Callback Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
  });

  describe('JWT Callback Coverage', () => {
    it('should test JWT callback with new user data', async () => {
      const newUser = {
        id: 'user123',
        email: 'test@example.com',
        subscriptionTier: 'premium',
        firstName: 'John',
        lastName: 'Doe'
      };
      const token = { email: 'old@example.com' };
      const result = await testCallback(mockNextAuth, 'jwt', { token, user: newUser });

      expect(result.subscriptionTier).toBe('premium');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('test@example.com');
    });

    it('should test JWT callback with missing sub field', async () => {
      const user = { id: 'user123' };
      const token = { email: 'test@example.com' };
      const result = await testCallback(mockNextAuth, 'jwt', { token, user });
      expect(result.sub).toBe('user123');
    });

    it('should test JWT callback error handling', async () => {
      const problematicUser = { get subscriptionTier() { throw new Error('User access error'); } };
      const token = { email: 'test@example.com' };

      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback(mockNextAuth, 'jwt', { token, user: problematicUser });
        expect(result).toEqual(token);
      });
    });

    it('should test JWT callback with minimal user data', async () => {
      const minimalUser = { id: 'user123', email: 'test@example.com' };
      const token = { sub: 'old-user', email: 'old@example.com' };
      const result = await testCallback(mockNextAuth, 'jwt', { token, user: minimalUser });

      expect(result.sub).toBe('user123');
      expect(result.email).toBe('test@example.com');
    });

    it('should test JWT callback with complete user profile', async () => {
      const completeUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'enterprise',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      const token = { email: 'old@example.com' };
      const result = await testCallback(mockNextAuth, 'jwt', { token, user: completeUser });

      expect(result.sub).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.subscriptionTier).toBe('enterprise');
    });

    it('should test JWT callback with token-only update', async () => {
      const existingToken = {
        sub: 'user123',
        email: 'test@example.com',
        subscriptionTier: 'free',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      // No user provided, should return existing token
      const result = await testCallback(mockNextAuth, 'jwt', { token: existingToken });
      expect(result).toEqual(existingToken);
    });

    it('should test JWT callback with different subscription tiers', async () => {
      const subscriptionTiers = ['free', 'premium', 'enterprise', 'unlimited'];

      for (const tier of subscriptionTiers) {
        const user = {
          id: 'user123',
          email: 'test@example.com',
          subscriptionTier: tier
        };
        const token = { email: 'old@example.com' };
        const result = await testCallback(mockNextAuth, 'jwt', { token, user });

        expect(result.subscriptionTier).toBe(tier);
        expect(result.sub).toBe('user123');
      }
    });

    it('should test JWT callback with null and undefined values', async () => {
      const testCases = [
        { user: null, token: { email: 'test@example.com' } },
        { user: undefined, token: { email: 'test@example.com' } },
        { user: { id: 'user123' }, token: null },
        { user: { id: 'user123' }, token: undefined }
      ];

      for (const { user, token } of testCases) {
        // Should not throw and handle gracefully
        await expect(testCallback(mockNextAuth, 'jwt', { token, user })).resolves.toBeDefined();
      }
    });
  });
});