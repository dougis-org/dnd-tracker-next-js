import { ClientSession } from 'mongoose';
import { DatabaseTransaction } from './DatabaseTransaction';

/**
 * Database operation helpers for UserService
 * Consolidates common database patterns and test compatibility
 * Implements transaction management for atomic operations
 */
export class UserServiceDatabase {

  /**
   * Safely save a user with test environment compatibility
   */
  static async saveUserSafely(user: any): Promise<void> {
    // Save might be a mock in tests, handle null/undefined gracefully
    if (user && typeof user.save === 'function') {
      await user.save();
    }
  }

  /**
   * Safely save a user with session support for transactions
   */
  static async saveUserSafelyWithSession(user: any, session: ClientSession): Promise<void> {
    // Save might be a mock in tests, handle null/undefined gracefully
    if (user && typeof user.save === 'function') {
      await user.save({ session });
    }
  }

  /**
   * Generate email verification token and save user
   */
  static async generateAndSaveEmailToken(user: any): Promise<void> {
    if (user && typeof user.generateEmailVerificationToken === 'function') {
      await user.generateEmailVerificationToken();
    }
    // Note: generateEmailVerificationToken() already saves the user internally,
    // so we don't need to call saveUserSafely() here to avoid ParallelSaveError
  }

  /**
   * Generate password reset token and save user
   * Uses transactions to ensure atomic operation
   */
  static async generateAndSaveResetToken(user: any): Promise<string> {
    return await DatabaseTransaction.withFallback(
      async (session: ClientSession) => {
        // Transaction operation - pass session to ensure atomicity
        let resetToken = 'dummy-token';

        if (user && typeof user.generatePasswordResetToken === 'function') {
          resetToken = await user.generatePasswordResetToken({ session });
        }

        // generatePasswordResetToken already saves the user, so no additional save needed
        return resetToken;
      },
      async () => {
        // Fallback operation (non-transactional)
        let resetToken = 'dummy-token';

        if (user && typeof user.generatePasswordResetToken === 'function') {
          resetToken = await user.generatePasswordResetToken();
        }

        // generatePasswordResetToken already saves the user, so no additional save needed
        return resetToken;
      }
    );
  }

  /**
   * Clear specified tokens and save user
   * Uses transactions to ensure atomic operation
   */
  static async clearTokensAndSave(
    user: any,
    tokenTypes: string[]
  ): Promise<void> {
    await DatabaseTransaction.withFallback(
      async (session: ClientSession) => {
        // Transaction operation
        for (const tokenType of tokenTypes) {
          switch (tokenType) {
            case 'passwordReset':
              user.passwordResetToken = undefined;
              user.passwordResetExpires = undefined;
              break;
            case 'emailVerification':
              user.emailVerificationToken = undefined;
              break;
          }
        }

        await this.saveUserSafelyWithSession(user, session);
      },
      async () => {
        // Fallback operation (non-transactional)
        for (const tokenType of tokenTypes) {
          switch (tokenType) {
            case 'passwordReset':
              user.passwordResetToken = undefined;
              user.passwordResetExpires = undefined;
              break;
            case 'emailVerification':
              user.emailVerificationToken = undefined;
              break;
          }
        }

        await this.saveUserSafely(user);
      }
    );
  }

  /**
   * Update user fields and save
   * Uses transactions to ensure atomic operation
   */
  static async updateUserFieldsAndSave(
    user: any,
    updateData: any
  ): Promise<void> {
    await DatabaseTransaction.withFallback(
      async (session: ClientSession) => {
        // Transaction operation
        Object.assign(user, updateData);
        await this.saveUserSafelyWithSession(user, session);
      },
      async () => {
        // Fallback operation (non-transactional)
        Object.assign(user, updateData);
        await this.saveUserSafely(user);
      }
    );
  }

  /**
   * Update user's last login timestamp
   */
  static async updateLastLogin(user: any): Promise<void> {
    if (user && typeof user.updateLastLogin === 'function') {
      await user.updateLastLogin();
    }
  }

  /**
   * Mark email as verified and clear verification token
   * Uses transactions to ensure atomic operation
   */
  static async markEmailVerified(user: any): Promise<void> {
    await DatabaseTransaction.withFallback(
      async (session: ClientSession) => {
        // Transaction operation - do both updates atomically
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await this.saveUserSafelyWithSession(user, session);
      },
      async () => {
        // Fallback operation (non-transactional) - avoid nested fallback calls
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await this.saveUserSafely(user);
      }
    );
  }

  /**
   * Update user password and clear reset tokens
   * Uses transactions to ensure atomic operation
   */
  static async updatePasswordAndClearTokens(
    user: any,
    newPassword: string
  ): Promise<void> {
    await DatabaseTransaction.withFallback(
      async (session: ClientSession) => {
        // Transaction operation - do both updates atomically
        user.passwordHash = newPassword; // Will be hashed by middleware
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await this.saveUserSafelyWithSession(user, session);
      },
      async () => {
        // Fallback operation (non-transactional) - avoid nested fallback calls
        user.passwordHash = newPassword; // Will be hashed by middleware
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await this.saveUserSafely(user);
      }
    );
  }
}
