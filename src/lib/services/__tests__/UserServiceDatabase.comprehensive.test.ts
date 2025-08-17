import { UserServiceDatabase } from '../UserServiceDatabase';
import { DatabaseTransaction } from '../DatabaseTransaction';
import { ClientSession } from 'mongoose';

// Mock DatabaseTransaction
jest.mock('../DatabaseTransaction');

describe('UserServiceDatabase - Comprehensive Coverage', () => {
  let mockUser: any;
  let mockSession: jest.Mocked<ClientSession>;
  let mockDatabaseTransaction: jest.Mocked<typeof DatabaseTransaction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock user with all required methods
    mockUser = {
      save: jest.fn().mockResolvedValue(undefined),
      generateEmailVerificationToken: jest.fn().mockResolvedValue('email-token'),
      generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token'),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      isEmailVerified: false,
      emailVerificationToken: 'test-email-token',
      passwordResetToken: 'test-reset-token',
      passwordResetExpires: new Date(),
      passwordHash: 'old-hash',
    };

    // Create mock session
    mockSession = {} as jest.Mocked<ClientSession>;

    // Mock DatabaseTransaction
    mockDatabaseTransaction = DatabaseTransaction as jest.Mocked<typeof DatabaseTransaction>;
    mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, _fallbackOp) => {
      // Default to running transaction operation
      return await transactionOp(mockSession);
    });
  });

  describe('saveUserSafely', () => {
    it('should save user when user has save method', async () => {
      await UserServiceDatabase.saveUserSafely(mockUser);
      expect(mockUser.save).toHaveBeenCalledWith();
    });

    it('should handle null user gracefully', async () => {
      await expect(UserServiceDatabase.saveUserSafely(null)).resolves.not.toThrow();
    });

    it('should handle undefined user gracefully', async () => {
      await expect(UserServiceDatabase.saveUserSafely(undefined)).resolves.not.toThrow();
    });

    it('should handle user without save method gracefully', async () => {
      const userWithoutSave = { name: 'test' };
      await expect(UserServiceDatabase.saveUserSafely(userWithoutSave)).resolves.not.toThrow();
    });

    it('should handle user with non-function save property', async () => {
      const userWithInvalidSave = { save: 'not-a-function' };
      await expect(UserServiceDatabase.saveUserSafely(userWithInvalidSave)).resolves.not.toThrow();
    });
  });

  describe('saveUserSafelyWithSession', () => {
    it('should save user with session when user has save method', async () => {
      await UserServiceDatabase.saveUserSafelyWithSession(mockUser, mockSession);
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should handle null user gracefully', async () => {
      await expect(UserServiceDatabase.saveUserSafelyWithSession(null, mockSession)).resolves.not.toThrow();
    });

    it('should handle undefined user gracefully', async () => {
      await expect(UserServiceDatabase.saveUserSafelyWithSession(undefined, mockSession)).resolves.not.toThrow();
    });

    it('should handle user without save method gracefully', async () => {
      const userWithoutSave = { name: 'test' };
      await expect(UserServiceDatabase.saveUserSafelyWithSession(userWithoutSave, mockSession)).resolves.not.toThrow();
    });
  });

  describe('generateAndSaveEmailToken', () => {
    it('should generate email token when user has method', async () => {
      await UserServiceDatabase.generateAndSaveEmailToken(mockUser);
      expect(mockUser.generateEmailVerificationToken).toHaveBeenCalled();
    });

    it('should handle null user gracefully', async () => {
      await expect(UserServiceDatabase.generateAndSaveEmailToken(null)).resolves.not.toThrow();
    });

    it('should handle user without method gracefully', async () => {
      const userWithoutMethod = { name: 'test' };
      await expect(UserServiceDatabase.generateAndSaveEmailToken(userWithoutMethod)).resolves.not.toThrow();
    });

    it('should handle user with non-function method property', async () => {
      const userWithInvalidMethod = { generateEmailVerificationToken: 'not-a-function' };
      await expect(UserServiceDatabase.generateAndSaveEmailToken(userWithInvalidMethod)).resolves.not.toThrow();
    });
  });

  describe('generateAndSaveResetToken', () => {
    it('should use transaction operation when transaction succeeds', async () => {
      const result = await UserServiceDatabase.generateAndSaveResetToken(mockUser);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.generatePasswordResetToken).toHaveBeenCalledWith({ session: mockSession });
      // generatePasswordResetToken already saves the user, so no additional save call
      expect(result).toBe('reset-token');
    });

    it('should use fallback operation when transaction fails', async () => {
      // Mock transaction to fail and use fallback
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      const result = await UserServiceDatabase.generateAndSaveResetToken(mockUser);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.generatePasswordResetToken).toHaveBeenCalledWith(); // No session in fallback
      // generatePasswordResetToken already saves the user, so no additional save call
      expect(result).toBe('reset-token');
    });

    it('should handle null user gracefully in transaction', async () => {
      const result = await UserServiceDatabase.generateAndSaveResetToken(null);
      expect(result).toBe('dummy-token');
    });

    it('should handle user without method gracefully in transaction', async () => {
      const userWithoutMethod = { name: 'test' };
      const result = await UserServiceDatabase.generateAndSaveResetToken(userWithoutMethod);
      expect(result).toBe('dummy-token');
    });

    it('should handle null user gracefully in fallback', async () => {
      // Force fallback operation
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      const result = await UserServiceDatabase.generateAndSaveResetToken(null);
      expect(result).toBe('dummy-token');
    });
  });

  describe('clearTokensAndSave', () => {
    it('should clear password reset tokens in transaction', async () => {
      await UserServiceDatabase.clearTokensAndSave(mockUser, ['passwordReset']);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should clear email verification tokens in transaction', async () => {
      await UserServiceDatabase.clearTokensAndSave(mockUser, ['emailVerification']);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should clear multiple token types in transaction', async () => {
      await UserServiceDatabase.clearTokensAndSave(mockUser, ['passwordReset', 'emailVerification']);

      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.emailVerificationToken).toBeUndefined();
    });

    it('should handle unknown token types gracefully', async () => {
      const originalUser = { ...mockUser };
      await UserServiceDatabase.clearTokensAndSave(mockUser, ['unknownToken']);

      // Should not modify any properties for unknown token types
      expect(mockUser.passwordResetToken).toBe(originalUser.passwordResetToken);
      expect(mockUser.emailVerificationToken).toBe(originalUser.emailVerificationToken);
    });

    it('should use fallback operation correctly', async () => {
      // Force fallback operation
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      await UserServiceDatabase.clearTokensAndSave(mockUser, ['passwordReset', 'emailVerification']);

      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith(); // Without session
    });

    it('should handle empty token types array', async () => {
      const originalUser = { ...mockUser };
      await UserServiceDatabase.clearTokensAndSave(mockUser, []);

      // Should not modify any properties
      expect(mockUser.passwordResetToken).toBe(originalUser.passwordResetToken);
      expect(mockUser.emailVerificationToken).toBe(originalUser.emailVerificationToken);
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });
  });

  describe('updateUserFieldsAndSave', () => {
    it('should update user fields in transaction', async () => {
      const updateData = { name: 'Updated Name', email: 'updated@test.com' };

      await UserServiceDatabase.updateUserFieldsAndSave(mockUser, updateData);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.email).toBe('updated@test.com');
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should update user fields in fallback operation', async () => {
      // Force fallback operation
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      const updateData = { name: 'Updated Name', email: 'updated@test.com' };

      await UserServiceDatabase.updateUserFieldsAndSave(mockUser, updateData);

      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.email).toBe('updated@test.com');
      expect(mockUser.save).toHaveBeenCalledWith(); // Without session
    });

    it('should handle empty update data', async () => {
      const originalUser = { ...mockUser };

      await UserServiceDatabase.updateUserFieldsAndSave(mockUser, {});

      // Should not change existing properties
      expect(mockUser.isEmailVerified).toBe(originalUser.isEmailVerified);
      expect(mockUser.passwordHash).toBe(originalUser.passwordHash);
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should handle null update data', async () => {
      await expect(UserServiceDatabase.updateUserFieldsAndSave(mockUser, null)).resolves.not.toThrow();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login when user has method', async () => {
      await UserServiceDatabase.updateLastLogin(mockUser);
      expect(mockUser.updateLastLogin).toHaveBeenCalled();
    });

    it('should handle null user gracefully', async () => {
      await expect(UserServiceDatabase.updateLastLogin(null)).resolves.not.toThrow();
    });

    it('should handle user without method gracefully', async () => {
      const userWithoutMethod = { name: 'test' };
      await expect(UserServiceDatabase.updateLastLogin(userWithoutMethod)).resolves.not.toThrow();
    });
  });

  describe('markEmailVerified', () => {
    it('should mark email verified in transaction', async () => {
      await UserServiceDatabase.markEmailVerified(mockUser);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should use fallback operation when transaction fails', async () => {
      // Force fallback operation
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      await UserServiceDatabase.markEmailVerified(mockUser);

      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith(); // Without session in fallback
    });
  });

  describe('updatePasswordAndClearTokens', () => {
    it('should update password and clear tokens in transaction', async () => {
      const newPassword = 'test-password-hash'; // Test data - not a real password

      await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, newPassword);

      expect(mockDatabaseTransaction.withFallback).toHaveBeenCalled();
      expect(mockUser.passwordHash).toBe(newPassword);
      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
    });

    it('should use fallback operation when transaction fails', async () => {
      // Force fallback operation
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, fallbackOp) => {
        return await fallbackOp();
      });

      const newPassword = 'test-new-password-hash'; // Test data - not a real password

      await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, newPassword);

      expect(mockUser.passwordHash).toBe(newPassword);
      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalledWith(); // Without session in fallback
    });

    it('should handle empty password string', async () => {
      await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, '');

      expect(mockUser.passwordHash).toBe('');
      expect(mockUser.passwordResetToken).toBeUndefined();
    });

    it('should handle null password', async () => {
      await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, null);

      expect(mockUser.passwordHash).toBe(null);
      expect(mockUser.passwordResetToken).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from transaction operations', async () => {
      const error = new Error('Transaction operation failed');
      mockUser.save.mockRejectedValue(error);

      // Mock DatabaseTransaction to actually call the transaction operation and let it fail
      mockDatabaseTransaction.withFallback.mockImplementation(async (transactionOp, _fallbackOp) => {
        return await transactionOp(mockSession);
      });

      await expect(UserServiceDatabase.markEmailVerified(mockUser)).rejects.toThrow('Transaction operation failed');
    });

    it('should propagate errors from fallback operations', async () => {
      const error = new Error('Fallback operation failed');

      // Force fallback and make it fail
      mockDatabaseTransaction.withFallback.mockRejectedValue(error);

      await expect(UserServiceDatabase.markEmailVerified(mockUser)).rejects.toThrow('Fallback operation failed');
    });

    it('should handle save errors gracefully in saveUserSafely', async () => {
      mockUser.save.mockRejectedValue(new Error('Save failed'));

      await expect(UserServiceDatabase.saveUserSafely(mockUser)).rejects.toThrow('Save failed');
    });
  });
});