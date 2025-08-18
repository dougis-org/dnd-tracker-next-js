import User from '@/lib/models/User';
import {
  UserNotFoundError,
  TokenInvalidError,
  ServiceResult,
} from '@/lib/services/UserServiceErrors';
import { UserServiceResponseHelpers } from '@/lib/services/UserServiceResponseHelpers';
import { executeWithConnection } from '@/lib/db-connection-manager';

/**
 * User lookup utilities for UserService
 * Centralizes all user finding operations with consistent error handling
 */
export class UserServiceLookup {

  /**
   * Find user by ID and return standardized error if not found
   * Enhanced with connection management for Issue #620
   */
  static async findUserOrError(userId: string): Promise<ServiceResult<any>> {
    const user = await executeWithConnection(() => User.findById(userId));
    if (!user) {
      return UserServiceResponseHelpers.createErrorResponse(
        new UserNotFoundError(userId)
      );
    }
    return UserServiceResponseHelpers.createSuccessResponse(user);
  }

  /**
   * Find user by ID or throw UserNotFoundError
   * Enhanced with connection management for Issue #620
   */
  static async findUserByIdOrThrow(userId: string): Promise<any> {
    const user = await executeWithConnection(() => User.findById(userId));
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }

  /**
   * Find user by email or throw UserNotFoundError
   * Enhanced with connection management for Issue #620
   */
  static async findUserByEmailOrThrow(email: string): Promise<any> {
    const user = await executeWithConnection(() => User.findByEmail(email));
    if (!user) {
      throw new UserNotFoundError(email);
    }
    return user;
  }

  /**
   * Find user by email (nullable return for security operations)
   * Enhanced with connection management for Issue #620
   */
  static async findUserByEmailNullable(email: string): Promise<any | null> {
    return await executeWithConnection(() => User.findByEmail(email));
  }

  /**
   * Find user by password reset token or throw TokenInvalidError
   * Enhanced with connection management for Issue #620
   */
  static async findUserByResetTokenOrThrow(token: string): Promise<any> {
    const user = await executeWithConnection(() => User.findByResetToken(token));
    if (!user) {
      throw new TokenInvalidError('Password reset');
    }
    return user;
  }

  /**
   * Find user by email verification token or throw TokenInvalidError
   * Enhanced with connection management for Issue #620
   */
  static async findUserByVerificationTokenOrThrow(token: string): Promise<any> {
    const user = await executeWithConnection(() => User.findByVerificationToken(token));
    if (!user) {
      throw new TokenInvalidError('Email verification');
    }
    return user;
  }

  /**
   * Check if user exists and return boolean
   */
  static async userExists(userId: string): Promise<boolean> {
    try {
      await this.findUserByIdOrThrow(userId);
      return true;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if email exists and return boolean
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      await this.findUserByEmailOrThrow(email);
      return true;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return false;
      }
      throw error;
    }
  }
}
