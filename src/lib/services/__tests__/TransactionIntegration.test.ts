import '../__test-helpers__/test-setup';
import { DatabaseTransaction } from '../DatabaseTransaction';
import { UserServiceDatabase } from '../UserServiceDatabase';

// These tests verify the integration between transaction classes
// and their usage in real service scenarios

describe('Transaction Integration Tests', () => {
  describe('UserServiceDatabase with DatabaseTransaction Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Transaction-Enabled Operations', () => {
      it('should integrate markEmailVerified with transaction fallback', async () => {
        // Mock user with required properties
        const mockUser = {
          isEmailVerified: false,
          emailVerificationToken: 'test-token',
          save: jest.fn().mockResolvedValue(undefined),
        };

        // Mock DatabaseTransaction.withFallback to call the transaction operation
        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            // Simulate transaction succeeding
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        await UserServiceDatabase.markEmailVerified(mockUser);

        expect(withFallbackSpy).toHaveBeenCalled();
        expect(mockUser.isEmailVerified).toBe(true);
        expect(mockUser.emailVerificationToken).toBeUndefined();
        expect(mockUser.save).toHaveBeenCalledWith({ session: expect.any(Object) });

        withFallbackSpy.mockRestore();
      });

      it('should integrate updatePasswordAndClearTokens with transaction fallback', async () => {
        const mockUser = {
          passwordHash: 'old-hash',
          passwordResetToken: 'test-token',
          passwordResetExpires: new Date(),
          save: jest.fn().mockResolvedValue(undefined),
        };

        // Mock DatabaseTransaction.withFallback to call the transaction operation
        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        const newPassword = 'new-hash';
        await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, newPassword);

        expect(withFallbackSpy).toHaveBeenCalled();
        expect(mockUser.passwordHash).toBe(newPassword);
        expect(mockUser.passwordResetToken).toBeUndefined();
        expect(mockUser.passwordResetExpires).toBeUndefined();
        expect(mockUser.save).toHaveBeenCalledWith({ session: expect.any(Object) });

        withFallbackSpy.mockRestore();
      });

      it('should integrate generateAndSaveResetToken with transaction fallback', async () => {
        const mockUser = {
          generatePasswordResetToken: jest.fn().mockResolvedValue('new-reset-token'),
          save: jest.fn().mockResolvedValue(undefined),
        };

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        const result = await UserServiceDatabase.generateAndSaveResetToken(mockUser);

        expect(withFallbackSpy).toHaveBeenCalled();
        expect(mockUser.generatePasswordResetToken).toHaveBeenCalled();
        expect(mockUser.save).toHaveBeenCalledWith({ session: expect.any(Object) });
        expect(result).toBe('new-reset-token');

        withFallbackSpy.mockRestore();
      });
    });

    describe('Fallback Operation Integration', () => {
      it('should properly fallback when transactions are not supported', async () => {
        const mockUser = {
          isEmailVerified: false,
          emailVerificationToken: 'test-token',
          save: jest.fn().mockResolvedValue(undefined),
        };

        // Mock clearTokensAndSave to test fallback path
        const clearTokensSpy = jest.spyOn(UserServiceDatabase, 'clearTokensAndSave').mockResolvedValue();

        // Mock DatabaseTransaction.withFallback to call the fallback operation
        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (_transactionOp, fallbackOp) => {
            // Simulate transaction failing, calling fallback
            return await fallbackOp();
          }
        );

        await UserServiceDatabase.markEmailVerified(mockUser);

        expect(withFallbackSpy).toHaveBeenCalled();
        expect(mockUser.isEmailVerified).toBe(true);
        expect(clearTokensSpy).toHaveBeenCalledWith(mockUser, ['emailVerification']);

        withFallbackSpy.mockRestore();
        clearTokensSpy.mockRestore();
      });

      it('should properly fallback for password updates', async () => {
        const mockUser = {
          passwordHash: 'old-hash',
          passwordResetToken: 'test-token',
          passwordResetExpires: new Date(),
          save: jest.fn().mockResolvedValue(undefined),
        };

        // Mock clearTokensAndSave to test fallback path
        const clearTokensSpy = jest.spyOn(UserServiceDatabase, 'clearTokensAndSave').mockResolvedValue();

        // Mock DatabaseTransaction.withFallback to call the fallback operation
        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, fallbackOp) => {
            return await fallbackOp();
          }
        );

        const newPassword = 'new-hash';
        await UserServiceDatabase.updatePasswordAndClearTokens(mockUser, newPassword);

        expect(withFallbackSpy).toHaveBeenCalled();
        expect(mockUser.passwordHash).toBe(newPassword);
        expect(clearTokensSpy).toHaveBeenCalledWith(mockUser, ['passwordReset']);

        withFallbackSpy.mockRestore();
        clearTokensSpy.mockRestore();
      });
    });

    describe('Error Propagation Integration', () => {
      it('should propagate transaction errors correctly', async () => {
        const mockUser = {
          isEmailVerified: false,
          emailVerificationToken: 'test-token',
          save: jest.fn().mockRejectedValue(new Error('Database save failed')),
        };

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        await expect(UserServiceDatabase.markEmailVerified(mockUser)).rejects.toThrow('Database save failed');

        withFallbackSpy.mockRestore();
      });

      it('should handle and propagate fallback errors', async () => {
        const mockUser = {
          isEmailVerified: false,
          emailVerificationToken: 'test-token',
          save: jest.fn().mockResolvedValue(undefined),
        };

        // Mock clearTokensAndSave to fail in fallback
        const clearTokensSpy = jest.spyOn(UserServiceDatabase, 'clearTokensAndSave')
          .mockRejectedValue(new Error('Fallback operation failed'));

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, fallbackOp) => {
            return await fallbackOp();
          }
        );

        await expect(UserServiceDatabase.markEmailVerified(mockUser)).rejects.toThrow('Fallback operation failed');

        withFallbackSpy.mockRestore();
        clearTokensSpy.mockRestore();
      });
    });

    describe('Method Compatibility Integration', () => {
      it('should work with users that have all required methods', async () => {
        const completeUser = {
          isEmailVerified: false,
          emailVerificationToken: 'token',
          passwordHash: 'hash',
          passwordResetToken: 'reset-token',
          passwordResetExpires: new Date(),
          save: jest.fn().mockResolvedValue(undefined),
          generatePasswordResetToken: jest.fn().mockResolvedValue('new-token'),
          generateEmailVerificationToken: jest.fn().mockResolvedValue('new-email-token'),
          updateLastLogin: jest.fn().mockResolvedValue(undefined),
        };

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        // Test multiple operations work correctly
        await UserServiceDatabase.markEmailVerified(completeUser);
        expect(completeUser.isEmailVerified).toBe(true);

        await UserServiceDatabase.updatePasswordAndClearTokens(completeUser, 'new-hash');
        expect(completeUser.passwordHash).toBe('new-hash');

        const token = await UserServiceDatabase.generateAndSaveResetToken(completeUser);
        expect(token).toBe('new-token');

        await UserServiceDatabase.updateLastLogin(completeUser);
        expect(completeUser.updateLastLogin).toHaveBeenCalled();

        withFallbackSpy.mockRestore();
      });

      it('should gracefully handle users with missing methods', async () => {
        const incompleteUser = {
          isEmailVerified: false,
          emailVerificationToken: 'token',
          passwordHash: 'hash',
          // Missing save, generatePasswordResetToken, etc.
        };

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            const mockSession = {} as any;
            return await transactionOp(mockSession);
          }
        );

        // Should not throw errors for missing methods
        await expect(UserServiceDatabase.markEmailVerified(incompleteUser)).resolves.not.toThrow();
        await expect(UserServiceDatabase.updatePasswordAndClearTokens(incompleteUser, 'new-hash')).resolves.not.toThrow();
        await expect(UserServiceDatabase.generateAndSaveResetToken(incompleteUser)).resolves.not.toThrow();
        await expect(UserServiceDatabase.updateLastLogin(incompleteUser)).resolves.not.toThrow();

        withFallbackSpy.mockRestore();
      });
    });

    describe('Session Parameter Handling', () => {
      it('should pass session correctly to save operations in transactions', async () => {
        const mockUser = {
          isEmailVerified: false,
          emailVerificationToken: 'token',
          save: jest.fn().mockResolvedValue(undefined),
        };

        const mockSession = { sessionId: 'test-session' };

        const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockImplementation(
          async (transactionOp, _fallbackOp) => {
            return await transactionOp(mockSession as any);
          }
        );

        await UserServiceDatabase.markEmailVerified(mockUser);

        expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });

        withFallbackSpy.mockRestore();
      });

      it('should call saveUserSafelyWithSession correctly', async () => {
        const mockUser = {
          save: jest.fn().mockResolvedValue(undefined),
        };

        const mockSession = { sessionId: 'test-session' };

        await UserServiceDatabase.saveUserSafelyWithSession(mockUser, mockSession as any);

        expect(mockUser.save).toHaveBeenCalledWith({ session: mockSession });
      });
    });
  });

  describe('DatabaseTransaction Method Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify all DatabaseTransaction methods are accessible', () => {
      // Verify the API surface of DatabaseTransaction
      expect(typeof DatabaseTransaction.withTransaction).toBe('function');
      expect(typeof DatabaseTransaction.withSession).toBe('function');
      expect(typeof DatabaseTransaction.isTransactionSupported).toBe('function');
      expect(typeof DatabaseTransaction.withFallback).toBe('function');
    });

    it('should verify UserServiceDatabase uses correct DatabaseTransaction methods', () => {
      const withFallbackSpy = jest.spyOn(DatabaseTransaction, 'withFallback').mockResolvedValue(undefined);

      const mockUser = { save: jest.fn() };

      // All transactional methods should use withFallback
      UserServiceDatabase.markEmailVerified(mockUser);
      UserServiceDatabase.updatePasswordAndClearTokens(mockUser, 'new-pass');
      UserServiceDatabase.generateAndSaveResetToken(mockUser);
      UserServiceDatabase.clearTokensAndSave(mockUser, ['passwordReset']);
      UserServiceDatabase.updateUserFieldsAndSave(mockUser, {});

      expect(withFallbackSpy).toHaveBeenCalledTimes(5);

      withFallbackSpy.mockRestore();
    });
  });
});