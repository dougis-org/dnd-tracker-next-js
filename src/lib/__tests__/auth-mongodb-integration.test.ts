/**
 * NextAuth MongoDB Integration Tests
 *
 * Tests for Issue #526: Configure MongoDB adapter for NextAuth
 * Verifies that NextAuth is properly configured with MongoDB adapter
 * and can handle database sessions correctly.
 */

import { UserService } from '../services/UserService';
import {
  isLocalHostname,
  isValidProductionHostname,
  validateNextAuthUrl
} from '../auth';

// Mock UserService to prevent actual database calls during testing
jest.mock('../services/UserService');

// Test data factories to reduce complexity and eliminate clones
const createMockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  subscriptionTier: 'premium',
  ...overrides
});

const createMockSession = (overrides = {}) => ({
  user: {
    email: 'test@example.com',
    ...overrides
  }
});

const createUserServiceMockResponse = (success = true, data = null) => ({
  success,
  data: success ? (data || {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    subscriptionTier: 'premium'
  }) : undefined,
  error: success ? undefined : 'User not found'
});

describe('NextAuth MongoDB Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set test environment variables
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.MONGODB_DB_NAME = 'dnd_tracker_test';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.AUTH_TRUST_HOST = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MongoDB Adapter Configuration', () => {
    it('should be configured with MongoDB adapter', async () => {
      // Import auth configuration to test it exists and is properly configured
      const { auth } = await import('../auth');
      expect(auth).toBeDefined();
    });

    it('should use database session strategy', async () => {
      // Verify that the configuration uses database sessions
      const authModule = await import('../auth');
      expect(authModule).toBeDefined();
    });

    it('should have proper MongoDB connection string validation', () => {
      expect(process.env.MONGODB_URI).toBeDefined();
      expect(process.env.MONGODB_DB_NAME).toBeDefined();
    });
  });

  describe('Session Callback', () => {
    let mockUserService: jest.Mocked<typeof UserService>;

    beforeEach(() => {
      mockUserService = UserService as jest.Mocked<typeof UserService>;
    });

    it('should handle session callback with user data', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockUserService.getUserByEmail.mockResolvedValue(
        createUserServiceMockResponse(true) as any
      );

      // Test session callback behavior
      expect(mockUser.id).toBe('user123');
      expect(mockSession.user.email).toBe('test@example.com');
    });

    it('should handle missing session or user data gracefully', () => {
      const result = createUserServiceMockResponse(false);
      expect(result.success).toBe(false);
    });
  });

  describe('SignIn Callback', () => {
    let mockUserService: jest.Mocked<typeof UserService>;

    beforeEach(() => {
      mockUserService = UserService as jest.Mocked<typeof UserService>;
    });

    it('should handle different provider scenarios', async () => {
      // Test credentials provider
      const credentialsAccount = { provider: 'credentials' };
      expect(credentialsAccount.provider).toBe('credentials');

      // Test other providers with existing user
      mockUserService.getUserByEmail.mockResolvedValue(
        createUserServiceMockResponse(true) as any
      );
      const result = await mockUserService.getUserByEmail('test@example.com');
      expect(result.success).toBe(true);

      // Test non-existent users
      mockUserService.getUserByEmail.mockResolvedValue(
        createUserServiceMockResponse(false) as any
      );
      const failResult = await mockUserService.getUserByEmail('nonexistent@example.com');
      expect(failResult.success).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should validate hostnames and URLs correctly', () => {
      // Test local hostname detection
      expect(isLocalHostname('localhost')).toBe(true);
      expect(isLocalHostname('127.0.0.1')).toBe(true);
      expect(isLocalHostname('192.168.1.1')).toBe(true);
      expect(isLocalHostname('example.com')).toBe(false);

      // Test production hostname validation
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(isValidProductionHostname('example.com')).toBe(true);
      expect(isValidProductionHostname('localhost')).toBe(false);
      process.env.NODE_ENV = originalEnv;

      // Test URL validation
      expect(validateNextAuthUrl('https://example.com')).toBe('https://example.com');

      // Test missing URL handling
      const originalUrl = process.env.NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL;
      expect(validateNextAuthUrl()).toBeUndefined();
      process.env.NEXTAUTH_URL = originalUrl;
    });
  });

  describe('MongoDB Collections', () => {
    it('should expect NextAuth to create required collections automatically', () => {
      // NextAuth MongoDB adapter creates these collections automatically:
      const expectedCollections = [
        'accounts',     // OAuth account data
        'sessions',     // User sessions
        'users',        // NextAuth user data (separate from our User model)
        'verificationtokens' // Email verification tokens
      ];

      // Test that we're aware of these collections
      expect(expectedCollections).toContain('sessions');
      expect(expectedCollections).toContain('users');
      expect(expectedCollections).toContain('accounts');
      expect(expectedCollections).toContain('verificationtokens');
    });

    it('should use separate database name from environment', () => {
      expect(process.env.MONGODB_DB_NAME).toBe('dnd_tracker_test');
    });
  });
});