/**
 * Authentication Issue #620 Fix Validation Tests
 * Tests to verify the fixes implemented for consistent login failures
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { UserServiceAuth } from '@/lib/services/UserServiceAuth';
import { connectToDatabase } from '@/lib/db';

// Mock modules
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserServiceLookup');
jest.mock('@/lib/services/UserServiceDatabase');

const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

describe('Authentication Issue #620 Fix Validation', () => {
  const testCredentials = {
    email: 'doug@dougis.com',
    password: 'EXF5pke@njn7thm4nkr',
  };

  const mockUser = {
    _id: 'test-user-id',
    email: testCredentials.email,
    username: 'testuser',
    firstName: 'Doug',
    lastName: 'Test',
    passwordHash: '$2b$12$mockHashedPassword123456789',
    isEmailVerified: true,
    subscriptionTier: 'free',
    role: 'user',
    comparePassword: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue();
    mockUser.comparePassword = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhanced Database Connection Resilience', () => {
    it('should retry authentication on database connection failure', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock first attempt fails, second succeeds
      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValueOnce(null) // First attempt fails
        .mockResolvedValueOnce(mockUser); // Second attempt succeeds

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(UserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(2);
    });

    it('should handle database connection errors with exponential backoff', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock database error on first attempts, success on final attempt
      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(mockUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(UserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(3);
    });

    it('should return service unavailable after max retries', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock all attempts fail with database errors
      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_FAILED');
      expect(result.error?.statusCode).toBe(503);
      expect(UserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(3);
    });
  });

  describe('Enhanced User Validation', () => {
    it('should validate user object completeness', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock incomplete user object
      const incompleteUser = {
        ...mockUser,
        email: undefined, // Missing required field
      };

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(incompleteUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate password hash format', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock user with invalid password hash
      const invalidHashUser = {
        ...mockUser,
        passwordHash: 'invalid-hash-format', // Should start with $2
      };

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(invalidHashUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate comparePassword method exists', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock user without comparePassword method
      const userWithoutMethod = {
        ...mockUser,
        comparePassword: undefined,
      };

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(userWithoutMethod);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Enhanced Password Verification', () => {
    it('should retry password comparison on failure', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison fails first, succeeds second
      mockUser.comparePassword = jest.fn()
        .mockRejectedValueOnce(new Error('bcrypt error'))
        .mockResolvedValueOnce(true);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(2);
    });

    it('should fail after password comparison retries exhausted', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison always fails
      mockUser.comparePassword = jest.fn()
        .mockRejectedValue(new Error('bcrypt error'));

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('Final User State Validation', () => {
    it('should verify user still exists after successful authentication', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock user exists during authentication but disappears at the end
      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValueOnce(mockUser) // Initial lookup
        .mockResolvedValueOnce(mockUser) // Retry lookup
        .mockResolvedValueOnce(null);    // Final validation fails

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return the latest user state after successful authentication', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');
      const { UserServiceDatabase } = require('@/lib/services/UserServiceDatabase');

      const updatedUser = {
        ...mockUser,
        subscriptionTier: 'expert', // User upgraded during auth
      };

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValueOnce(mockUser)     // Initial lookup
        .mockResolvedValueOnce(updatedUser); // Final validation

      UserServiceDatabase.updateLastLogin = jest.fn().mockResolvedValue();

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.subscriptionTier).toBe('expert');
    });
  });

  describe('Credential Validation Bypass', () => {
    it('should not retry on definitive credential errors', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      // Mock user not found (definitive error)
      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(null);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      // Should only try once, not retry for credential errors
      expect(UserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(1);
    });

    it('should not retry on password mismatch', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison returns false (wrong password)
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      // Should only attempt authentication once for wrong password
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Real Credentials', () => {
    it('should handle the exact credentials from Issue #620', async () => {
      const { UserServiceLookup } = require('@/lib/services/UserServiceLookup');
      const { UserServiceDatabase } = require('@/lib/services/UserServiceDatabase');

      UserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      UserServiceDatabase.updateLastLogin = jest.fn().mockResolvedValue();

      const result = await UserServiceAuth.authenticateUser({
        email: 'doug@dougis.com',
        password: 'EXF5pke@njn7thm4nkr',
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('doug@dougis.com');
      expect(result.data?.requiresVerification).toBe(false);
    });
  });
});