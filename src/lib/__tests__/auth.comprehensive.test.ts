import '../__test-helpers__/test-setup';
import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';

const mockGetUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockAuthenticateUser = jest.fn() as jest.MockedFunction<any>;
const mockNextAuth = jest.fn();

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: mockGetUserByEmail,
    authenticateUser: mockAuthenticateUser,
  },
}));

jest.mock('next-auth', () => mockNextAuth);
jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn().mockReturnValue({}),
}));
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({})),
}));

describe('NextAuth Comprehensive Tests', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('NextAuth Configuration', () => {
    it('should configure NextAuth with all required settings', async () => {
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      process.env.NODE_ENV = 'production';
      process.env.AUTH_TRUST_HOST = 'true';
      process.env.MONGODB_DB_NAME = 'testdb';

      const authModule = await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];

      expect(config.adapter).toBeDefined();
      expect(config.trustHost).toBe(true);
      expect(config.providers).toBeDefined();
      expect(config.providers[0].name).toBe('credentials');
      expect(config.debug).toBe(false);
      expect(authModule.handlers).toBeDefined();
      expect(authModule.auth).toBeDefined();
      expect(authModule.signIn).toBeDefined();
      expect(authModule.signOut).toBeDefined();
    });

    it('should enable debug in development', async () => {
      process.env.NODE_ENV = 'development';
      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];
      expect(config.debug).toBe(true);
    });
  });

  describe('Authentication Flow', () => {
    const mockCredentials = { email: 'test@example.com', password: 'test123' };
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      subscriptionTier: 'premium',
    };

    it('should authenticate valid user', async () => {
      mockGetUserByEmail.mockResolvedValue({ success: true, data: mockUser });
      mockAuthenticateUser.mockResolvedValue({ 
        success: true, 
        data: { user: mockUser, requiresVerification: false } 
      });

      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];
      const result = await config.providers[0].authorize(mockCredentials);

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'testuser',
        subscriptionTier: 'premium',
      });
    });

    it('should reject invalid credentials', async () => {
      mockGetUserByEmail.mockResolvedValue({ success: false });
      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];
      const result = await config.providers[0].authorize(mockCredentials);
      expect(result).toBeNull();
    });

    it('should handle missing credentials', async () => {
      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];
      const result = await config.providers[0].authorize({});
      expect(result).toBeNull();
    });
  });

  describe('URL Validation', () => {
    it('should handle various URL formats', async () => {
      const testCases = [
        { url: '/dashboard', baseUrl: 'https://example.com', expected: 'https://example.com/dashboard' },
        { url: 'https://dnd-tracker-next-js.fly.dev/dashboard', baseUrl: 'https://example.com', expected: 'https://dnd-tracker-next-js.fly.dev/dashboard' },
      ];

      process.env.NODE_ENV = 'production';
      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];

      for (const { url, baseUrl, expected } of testCases) {
        const result = await config.callbacks.redirect({ url, baseUrl });
        expect(result).toBe(expected);
      }
    });

    it('should block untrusted URLs in production', async () => {
      process.env.NODE_ENV = 'production';
      await import('../auth');
      const config = mockNextAuth.mock.calls[0][0];
      
      const result = await config.callbacks.redirect({
        url: 'https://malicious-site.com/dashboard',
        baseUrl: 'https://example.com'
      });
      expect(result).toBe('https://example.com');
    });
  });

  describe('MongoDB Integration', () => {
    it('should handle missing MONGODB_URI gracefully', async () => {
      delete process.env.MONGODB_URI;
      process.env.CI = 'true';
      
      expect(() => require('../auth')).not.toThrow();
    });
  });
});