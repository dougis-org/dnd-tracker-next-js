/**
 * Comprehensive Test Coverage for Issue #620 Authentication Fix
 * Tests the authentication enhancements implemented to resolve login failures
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { UserServiceAuth } from '@/lib/services/UserServiceAuth';
import { connectToDatabase } from '@/lib/db';
import { UserServiceLookup } from '@/lib/services/UserServiceLookup';
import { UserServiceDatabase } from '@/lib/services/UserServiceDatabase';
import { InvalidCredentialsError } from '@/lib/services/UserServiceErrors';

// Mock modules
jest.mock('@/lib/db');
jest.mock('@/lib/models/User', () => ({
  default: {
    findByEmail: jest.fn(),
  }
}));
jest.mock('@/lib/services/UserServiceLookup');
jest.mock('@/lib/services/UserServiceDatabase');
jest.mock('@/lib/services/UserServiceValidation');
jest.mock('@/lib/services/UserServiceHelpers');
jest.mock('@/lib/utils/password-security');

const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockUserServiceLookup = UserServiceLookup as jest.Mocked<typeof UserServiceLookup>;
const mockUserServiceDatabase = UserServiceDatabase as jest.Mocked<typeof UserServiceDatabase>;

// Mock the validation and helper methods
const { UserServiceValidation } = jest.requireMock('@/lib/services/UserServiceValidation');
const { checkUserExists } = jest.requireMock('@/lib/services/UserServiceHelpers');
const { validatePasswordStrength, isPasswordHashed } = jest.requireMock('@/lib/utils/password-security');

describe('Authentication Issue #620 Comprehensive Coverage', () => {
  const testCredentials = {
    email: 'test@example.com',
    password: 'TestPassword123!',
  };

  const mockUser = {
    _id: 'test-user-id',
    email: testCredentials.email,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
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
    mockUserServiceDatabase.updateLastLogin = jest.fn().mockResolvedValue();

    // Mock validation methods
    UserServiceValidation.validateAndParseLogin = jest.fn().mockReturnValue(testCredentials);
    UserServiceValidation.validateAndParseRegistration = jest.fn().mockReturnValue({
      ...testCredentials,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });
    UserServiceValidation.validateAndParsePasswordChange = jest.fn().mockReturnValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!'
    });
    UserServiceValidation.validateAndParsePasswordResetRequest = jest.fn().mockReturnValue({ email: 'test@example.com' });
    UserServiceValidation.validateAndParsePasswordReset = jest.fn().mockReturnValue({
      token: 'reset-token-123',
      password: 'NewPassword789!'
    });
    UserServiceValidation.validateAndParseEmailVerification = jest.fn().mockReturnValue({ token: 'verify-token-123' });

    // Mock helper methods
    checkUserExists.mockResolvedValue(undefined);
    validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
    isPasswordHashed.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhanced Database Connection Resilience', () => {
    it('should successfully authenticate on first attempt', async () => {
      // Normal successful authentication
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(testCredentials.email);
      expect(mockUserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(2); // Initial lookup + final validation
      expect(mockConnectToDatabase).toHaveBeenCalledTimes(1);
    });

    it('should retry on database connection failures with exponential backoff', async () => {
      // Mock connection error followed by success
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockRejectedValueOnce(new Error('Database connection timeout'))
        .mockResolvedValueOnce(mockUser)  // Retry succeeds
        .mockResolvedValueOnce(mockUser); // Final validation

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(mockUserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(3);
      // connectToDatabase is called once per authentication attempt (retry happens within same attempt)
      expect(mockConnectToDatabase).toHaveBeenCalled();
    });

    it('should return AUTHENTICATION_FAILED after max retries exhausted', async () => {
      // All attempts fail with database errors
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockRejectedValue(new Error('Persistent database error'));

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_FAILED');
      expect(result.error?.statusCode).toBe(503);
      expect(mockUserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(3); // Max retries
    });

    it('should not retry on InvalidCredentialsError (definitive failures)', async () => {
      // User not found - should not retry
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(null);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      // Note: findUserByEmailNullable is called twice - once in findUserWithRetry and once in final validation
      expect(mockUserServiceLookup.findUserByEmailNullable).toHaveBeenCalledTimes(2);
    });
  });

  describe('Enhanced User Validation', () => {
    it('should validate user object completeness - missing email', async () => {
      const incompleteUser = {
        ...mockUser,
        email: undefined, // Missing required field
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(incompleteUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate user object completeness - missing _id', async () => {
      const incompleteUser = {
        ...mockUser,
        _id: undefined, // Missing required field
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(incompleteUser);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate password hash format - missing hash', async () => {
      const userWithoutHash = {
        ...mockUser,
        passwordHash: undefined,
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(userWithoutHash);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate password hash format - invalid length', async () => {
      const userWithShortHash = {
        ...mockUser,
        passwordHash: 'short', // Too short
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(userWithShortHash);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate password hash format - invalid prefix', async () => {
      const userWithInvalidHash = {
        ...mockUser,
        passwordHash: 'invalid-hash-format-not-bcrypt', // Doesn't start with $2
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(userWithInvalidHash);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate comparePassword method exists', async () => {
      const userWithoutMethod = {
        ...mockUser,
        comparePassword: undefined,
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(userWithoutMethod);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Enhanced Password Verification with Retry', () => {
    it('should retry password comparison on bcrypt error', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser)
        .mockResolvedValue(mockUser); // Final validation

      // Mock password comparison fails first, succeeds on retry
      mockUser.comparePassword = jest.fn()
        .mockRejectedValueOnce(new Error('bcrypt temporary error'))
        .mockResolvedValueOnce(true);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(2);
    });

    it('should return INVALID_CREDENTIALS after password retry limit', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison always fails
      mockUser.comparePassword = jest.fn()
        .mockRejectedValue(new Error('persistent bcrypt error'));

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(2); // Max retries for password
    });

    it('should not retry on incorrect password (returns false)', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison returns false (wrong password)
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(1); // No retry for wrong password
    });
  });

  describe('Final User State Validation', () => {
    it('should verify user still exists after authentication', async () => {
      // Mock user exists during auth but disappears at final validation
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValueOnce(mockUser) // Initial lookup
        .mockResolvedValueOnce(null);    // Final validation fails

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return latest user state after successful authentication', async () => {
      const updatedUser = {
        ...mockUser,
        subscriptionTier: 'premium', // User upgraded during auth
      };

      // Mock initial user, then updated user at final validation
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValueOnce(mockUser)     // Initial lookup
        .mockResolvedValueOnce(updatedUser); // Final validation with updates

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.subscriptionTier).toBe('premium');
    });
  });

  describe('Database Connection and Error Handling', () => {
    it('should call connectToDatabase once per authentication attempt', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser)
        .mockResolvedValue(mockUser);

      await UserServiceAuth.authenticateUser(testCredentials);

      expect(mockConnectToDatabase).toHaveBeenCalledTimes(1);
    });

    it('should handle updateLastLogin failure gracefully', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser)
        .mockResolvedValue(mockUser);

      // Mock updateLastLogin to fail
      mockUserServiceDatabase.updateLastLogin = jest.fn()
        .mockRejectedValue(new Error('Update failed'));

      const result = await UserServiceAuth.authenticateUser(testCredentials);

      // Should still succeed even if updateLastLogin fails
      expect(result.success).toBe(true);
      expect(mockUserServiceDatabase.updateLastLogin).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Exponential Backoff Timing', () => {
    it('should apply exponential backoff between retry attempts', async () => {
      const startTime = Date.now();

      // Mock multiple failures then success
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockRejectedValueOnce(new Error('Connection error 1'))
        .mockRejectedValueOnce(new Error('Connection error 2'))
        .mockResolvedValueOnce(mockUser)  // Third attempt succeeds
        .mockResolvedValueOnce(mockUser); // Final validation

      const result = await UserServiceAuth.authenticateUser(testCredentials);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // Should have taken at least 300ms (100ms + 200ms waits between attempts)
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
    });
  });

  describe('Input Validation Integration', () => {
    it('should handle validation errors from UserServiceValidation', async () => {
      const invalidCredentials = {
        email: '', // Invalid email
        password: '',
      };

      const result = await UserServiceAuth.authenticateUser(invalidCredentials);

      expect(result.success).toBe(false);
      // Should fail validation before reaching database operations
      expect(mockUserServiceLookup.findUserByEmailNullable).not.toHaveBeenCalled();
    });

    it('should handle valid credentials format', async () => {
      const validCredentials = {
        email: 'user@example.com',
        password: 'ValidPassword123!',
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser)
        .mockResolvedValue(mockUser);

      const result = await UserServiceAuth.authenticateUser(validCredentials);

      expect(result.success).toBe(true);
      expect(mockUserServiceLookup.findUserByEmailNullable).toHaveBeenCalled();
    });
  });

  describe('User Creation and Password Management Coverage', () => {
    it('should test password validation helper methods', async () => {
      // Mock weak password validation
      validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long']
      });

      // Test validatePasswordStrength path
      const weakCredentials = {
        email: 'test@example.com',
        password: '123', // Weak password
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await UserServiceAuth.createUser(weakCredentials);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PASSWORD');
    });

    it('should test password reset request functionality', async () => {
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock the database method
      const mockGenerateAndSaveResetToken = jest.fn().mockResolvedValue('reset-token-123');
      const UserServiceDatabase = require('@/lib/services/UserServiceDatabase');
      UserServiceDatabase.generateAndSaveResetToken = mockGenerateAndSaveResetToken;

      const resetData = { email: 'test@example.com' };
      const result = await UserServiceAuth.requestPasswordReset(resetData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('reset-token-123');
    });

    it('should test email verification functionality', async () => {
      const mockUserWithToken = {
        ...mockUser,
        emailVerificationToken: 'verify-token-123',
      };

      mockUserServiceLookup.findUserByVerificationTokenOrThrow = jest.fn()
        .mockResolvedValue(mockUserWithToken);

      // Mock the database method
      const mockMarkEmailVerified = jest.fn().mockResolvedValue(undefined);
      const UserServiceDatabase = require('@/lib/services/UserServiceDatabase');
      UserServiceDatabase.markEmailVerified = mockMarkEmailVerified;

      const verificationData = { token: 'verify-token-123' };
      const result = await UserServiceAuth.verifyEmail(verificationData);

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(mockUser.email);
    });

    it('should test change password functionality', async () => {
      mockUserServiceLookup.findUserByIdOrThrow = jest.fn()
        .mockResolvedValue(mockUser);

      // Mock password comparison to succeed
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);

      // Mock the database method
      const mockUpdatePasswordAndClearTokens = jest.fn().mockResolvedValue(undefined);
      const UserServiceDatabase = require('@/lib/services/UserServiceDatabase');
      UserServiceDatabase.updatePasswordAndClearTokens = mockUpdatePasswordAndClearTokens;

      const changePasswordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      const result = await UserServiceAuth.changePassword('user-id', changePasswordData);

      expect(result.success).toBe(true);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('OldPassword123!');
      expect(mockUpdatePasswordAndClearTokens).toHaveBeenCalledWith(mockUser, 'NewPassword456!');
    });

    it('should test reset password with token functionality', async () => {
      const mockUserWithResetToken = {
        ...mockUser,
        passwordResetToken: 'reset-token-123',
      };

      mockUserServiceLookup.findUserByResetTokenOrThrow = jest.fn()
        .mockResolvedValue(mockUserWithResetToken);

      // Mock the database method
      const mockUpdatePasswordAndClearTokens = jest.fn().mockResolvedValue(undefined);
      const UserServiceDatabase = require('@/lib/services/UserServiceDatabase');
      UserServiceDatabase.updatePasswordAndClearTokens = mockUpdatePasswordAndClearTokens;

      const resetData = {
        token: 'reset-token-123',
        password: 'NewPassword789!',
      };

      const result = await UserServiceAuth.resetPassword(resetData);

      expect(result.success).toBe(true);
      expect(mockUpdatePasswordAndClearTokens).toHaveBeenCalledWith(mockUserWithResetToken, 'NewPassword789!');
    });

    it('should test resend verification email functionality', async () => {
      const unverifiedUser = {
        ...mockUser,
        isEmailVerified: false,
      };

      mockUserServiceLookup.findUserByEmailOrThrow = jest.fn()
        .mockResolvedValue(unverifiedUser);

      // Mock the database method
      const mockGenerateAndSaveEmailToken = jest.fn().mockResolvedValue(undefined);
      const UserServiceDatabase = require('@/lib/services/UserServiceDatabase');
      UserServiceDatabase.generateAndSaveEmailToken = mockGenerateAndSaveEmailToken;

      const result = await UserServiceAuth.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(mockGenerateAndSaveEmailToken).toHaveBeenCalledWith(unverifiedUser);
    });

    it('should handle already verified email in resend verification', async () => {
      const verifiedUser = {
        ...mockUser,
        isEmailVerified: true,
      };

      mockUserServiceLookup.findUserByEmailOrThrow = jest.fn()
        .mockResolvedValue(verifiedUser);

      const result = await UserServiceAuth.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMAIL_ALREADY_VERIFIED');
    });
  });

  describe('Real-world Issue #620 Scenario', () => {
    it('should handle the exact failing credentials from Issue #620', async () => {
      const issueCredentials = {
        email: 'doug@dougis.com',
        password: 'EXF5pke@njn7thm4nkr',
      };

      const issueUser = {
        ...mockUser,
        email: issueCredentials.email,
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(issueUser)
        .mockResolvedValue(issueUser);

      const result = await UserServiceAuth.authenticateUser(issueCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('doug@dougis.com');
      expect(result.data?.requiresVerification).toBe(false);
    });

    it('should handle successive login attempts (the core Issue #620 problem)', async () => {
      const issueCredentials = {
        email: 'doug@dougis.com',
        password: 'EXF5pke@njn7thm4nkr',
      };

      const issueUser = {
        ...mockUser,
        email: issueCredentials.email,
      };

      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(issueUser);

      // First login
      const firstLogin = await UserServiceAuth.authenticateUser(issueCredentials);
      expect(firstLogin.success).toBe(true);

      // Reset mocks but keep the same behavior
      jest.clearAllMocks();
      mockUserServiceLookup.findUserByEmailNullable = jest.fn()
        .mockResolvedValue(issueUser);
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);
      mockUserServiceDatabase.updateLastLogin = jest.fn().mockResolvedValue();
      mockConnectToDatabase.mockResolvedValue();

      // Second login (this was failing before the fix)
      const secondLogin = await UserServiceAuth.authenticateUser(issueCredentials);
      expect(secondLogin.success).toBe(true);
      expect(secondLogin.data?.user.email).toBe('doug@dougis.com');
    });
  });
});