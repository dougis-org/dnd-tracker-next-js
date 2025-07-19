import { connectToDatabase } from '../db';
import User from '../models/User';
import {
  ServiceResult,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserServiceError,
} from './UserServiceErrors';
import {
  type UserRegistration,
  type UserLogin,
  type ChangePassword,
  type PasswordResetRequest,
  type PasswordReset,
  type EmailVerification,
  type PublicUser,
  type UserRegistrationResponse,
} from '../validations/user';
import { checkUserExists } from './UserServiceHelpers';
import { UserServiceValidation } from './UserServiceValidation';
import { UserServiceResponseHelpers } from './UserServiceResponseHelpers';
import { UserServiceDatabase } from './UserServiceDatabase';
import { UserServiceLookup } from './UserServiceLookup';
import {
  validatePasswordStrength,
  isPasswordHashed
} from '../utils/password-security';

/**
 * Authentication operations for UserService
 * Handles user registration, login, password management, and email verification
 */
export class UserServiceAuth {

  /**
   * Check if email verification should be bypassed based on environment variable
   * For MVP development purposes only
   */
  private static shouldBypassEmailVerification(): boolean {
    const bypassValue = process.env.BYPASS_EMAIL_VERIFICATION;
    return bypassValue === 'true';
  }

  /**
   * Create a new user account
   */
  static async createUser(
    userData: UserRegistration
  ): Promise<ServiceResult<UserRegistrationResponse>> {
    try {
      // Ensure database connection is established
      await connectToDatabase();

      // Validate input data and password
      const validatedData = UserServiceValidation.validateAndParseRegistration(userData);
      const passwordError = this.validatePassword(validatedData.password);
      if (passwordError) return passwordError;

      // Check if user already exists
      await checkUserExists(validatedData.email, validatedData.username);

      // Create and save new user with bypass flag tracking
      const bypassEmailVerification = this.shouldBypassEmailVerification();
      const newUser = await this.createAndSaveUser(validatedData);

      return UserServiceResponseHelpers.createSuccessResponse({
        user: UserServiceResponseHelpers.safeToPublicJSON(newUser),
        emailBypass: bypassEmailVerification,
      });
    } catch (error) {
      return this.handleUserCreationError(error);
    }
  }

  /**
   * Validate password strength and format
   */
  private static validatePassword(password: string): ServiceResult<never> | null {
    // SECURITY: Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: {
          message: `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
          code: 'INVALID_PASSWORD',
          statusCode: 400,
        },
      };
    }

    // SECURITY: Ensure password is not already hashed (should be plaintext for new users)
    if (isPasswordHashed(password)) {
      return {
        success: false,
        error: {
          message: 'Invalid password format',
          code: 'INVALID_PASSWORD_FORMAT',
          statusCode: 400,
        },
      };
    }

    return null;
  }

  /**
   * Create and save a new user with email verification token
   */
  private static async createAndSaveUser(validatedData: any) {
    // Check if email verification should be bypassed for MVP
    const bypassEmailVerification = this.shouldBypassEmailVerification();

    const newUser = new User({
      email: validatedData.email,
      username: validatedData.username,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      passwordHash: validatedData.password, // Will be hashed by middleware
      role: 'user',
      subscriptionTier: 'free',
      isEmailVerified: bypassEmailVerification,
    });

    // Only generate email verification token if bypass is not enabled
    if (!bypassEmailVerification) {
      await UserServiceDatabase.generateAndSaveEmailToken(newUser);
    } else {
      // Save user without generating email token when bypass is enabled
      await UserServiceDatabase.saveUserSafely(newUser);
    }

    return newUser;
  }

  /**
   * Handle errors during user creation with specific error type handling
   */
  private static handleUserCreationError(error: unknown): ServiceResult<never> {
    // Handle custom errors
    if (error instanceof UserAlreadyExistsError) {
      return UserServiceResponseHelpers.createErrorResponse(error);
    }

    // Handle validation errors first
    if (error instanceof Error && error.message.includes('validation')) {
      return UserServiceResponseHelpers.handleValidationError(error);
    }

    // Handle MongoDB and model-specific errors
    const mongoError = this.handleMongoErrors(error);
    if (mongoError) return mongoError;

    // Default to internal server error for unknown errors
    console.error('Unexpected error during user creation:', error);
    return this.createRegistrationFailedError();
  }

  /**
   * Handle MongoDB and model-specific errors
   */
  private static handleMongoErrors(error: unknown): ServiceResult<never> | null {
    if (!(error instanceof Error)) return null;

    // Handle MongoDB duplicate key errors
    if ('code' in error && (error as any).code === 11000) {
      const field = error.message.includes('email') ? 'email' : 'username';
      return this.createUserExistsError(field);
    }

    // Handle model validation errors
    if (error.message === 'Email already exists') {
      return this.createUserExistsError('email');
    }

    if (error.message === 'Username already exists') {
      return this.createUserExistsError('username');
    }

    return null;
  }

  /**
   * Create standardized user already exists error response
   */
  private static createUserExistsError(field: string): ServiceResult<never> {
    return {
      success: false,
      error: {
        message: `User already exists with this ${field}`,
        code: 'USER_ALREADY_EXISTS',
        statusCode: 409,
      },
    };
  }

  /**
   * Create standardized registration failed error response
   */
  private static createRegistrationFailedError(): ServiceResult<never> {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred during registration',
        code: 'REGISTRATION_FAILED',
        statusCode: 500,
      },
    };
  }

  /**
   * Authenticate user login
   */
  static async authenticateUser(
    loginData: UserLogin
  ): Promise<
    ServiceResult<{ user: PublicUser; requiresVerification: boolean }>
  > {
    try {
      // Validate input data
      const validatedData =
        UserServiceValidation.validateAndParseLogin(loginData);

      // Find user by email
      const user = await UserServiceLookup.findUserByEmailNullable(
        validatedData.email
      );
      if (!user) {
        throw new InvalidCredentialsError();
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(
        validatedData.password
      );
      if (!isPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Update last login timestamp
      await UserServiceDatabase.updateLastLogin(user);

      return UserServiceResponseHelpers.createSuccessResponse({
        user: UserServiceResponseHelpers.safeToPublicJSON(user),
        requiresVerification: !user.isEmailVerified,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return UserServiceResponseHelpers.createErrorResponse(error);
      }

      // Fallback for test compatibility
      return {
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
        },
      };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    passwordData: ChangePassword
  ): Promise<ServiceResult<void>> {
    try {
      // Validate input data
      const validatedData =
        UserServiceValidation.validateAndParsePasswordChange(passwordData);

      // SECURITY: Validate new password strength
      const passwordValidation = validatePasswordStrength(validatedData.newPassword);
      if (!passwordValidation.isValid) {
        throw new UserServiceError(
          `New password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
          'INVALID_PASSWORD',
          400
        );
      }

      // SECURITY: Ensure new password is not already hashed
      if (isPasswordHashed(validatedData.newPassword)) {
        throw new UserServiceError(
          'Invalid password format',
          'INVALID_PASSWORD_FORMAT',
          400
        );
      }

      // Find user
      const user = await UserServiceLookup.findUserByIdOrThrow(userId);

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        validatedData.currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw new UserServiceError(
          'Current password is incorrect',
          'INVALID_CURRENT_PASSWORD',
          400
        );
      }

      // Update password
      await UserServiceDatabase.updatePasswordAndClearTokens(
        user,
        validatedData.newPassword
      );

      return UserServiceResponseHelpers.createSuccessResponse();
    } catch (error) {
      if (error instanceof UserServiceError) {
        return UserServiceResponseHelpers.createErrorResponse(error);
      }

      return UserServiceResponseHelpers.handleCustomError(
        error,
        'Failed to change password',
        'PASSWORD_CHANGE_FAILED'
      );
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(
    resetData: PasswordResetRequest
  ): Promise<ServiceResult<{ token: string }>> {
    try {
      // Validate input data
      const validatedData =
        UserServiceValidation.validateAndParsePasswordResetRequest(resetData);

      // Find user by email
      const user = await UserServiceLookup.findUserByEmailNullable(
        validatedData.email
      );
      if (!user) {
        // For security, don't reveal that the email doesn't exist
        return UserServiceResponseHelpers.createSecurityResponse('dummy-token');
      }

      // Generate reset token and save
      const resetToken =
        await UserServiceDatabase.generateAndSaveResetToken(user);

      return UserServiceResponseHelpers.createSecurityResponse(resetToken);
    } catch (error) {
      return UserServiceResponseHelpers.handleCustomError(
        error,
        'Failed to process password reset request',
        'PASSWORD_RESET_REQUEST_FAILED'
      );
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    resetData: PasswordReset
  ): Promise<ServiceResult<void>> {
    try {
      // Validate input data
      const validatedData =
        UserServiceValidation.validateAndParsePasswordReset(resetData);

      // SECURITY: Validate new password strength
      const passwordValidation = validatePasswordStrength(validatedData.password);
      if (!passwordValidation.isValid) {
        throw new UserServiceError(
          `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
          'INVALID_PASSWORD',
          400
        );
      }

      // SECURITY: Ensure password is not already hashed
      if (isPasswordHashed(validatedData.password)) {
        throw new UserServiceError(
          'Invalid password format',
          'INVALID_PASSWORD_FORMAT',
          400
        );
      }

      // Find user by reset token
      const user = await UserServiceLookup.findUserByResetTokenOrThrow(
        validatedData.token
      );

      // Reset password and clear tokens
      await UserServiceDatabase.updatePasswordAndClearTokens(
        user,
        validatedData.password
      );

      return UserServiceResponseHelpers.createSuccessResponse();
    } catch (error) {
      if (error instanceof UserServiceError) {
        return UserServiceResponseHelpers.createErrorResponse(error);
      }

      return UserServiceResponseHelpers.handleCustomError(
        error,
        'Failed to reset password',
        'PASSWORD_RESET_FAILED'
      );
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(
    verificationData: EmailVerification
  ): Promise<ServiceResult<PublicUser>> {
    try {
      // Validate input data
      const validatedData =
        UserServiceValidation.validateAndParseEmailVerification(
          verificationData
        );

      // Find user by verification token
      const user = await UserServiceLookup.findUserByVerificationTokenOrThrow(
        validatedData.token
      );

      // Mark email as verified and clear token
      await UserServiceDatabase.markEmailVerified(user);

      return UserServiceResponseHelpers.createSuccessResponse(
        UserServiceResponseHelpers.safeToPublicJSON(user)
      );
    } catch (error) {
      if (error instanceof UserServiceError) {
        return UserServiceResponseHelpers.createErrorResponse(error);
      }

      return UserServiceResponseHelpers.handleCustomError(
        error,
        'Failed to verify email',
        'EMAIL_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    email: string
  ): Promise<ServiceResult<void>> {
    try {
      // Find user by email
      const user = await UserServiceLookup.findUserByEmailOrThrow(email);

      // Check if already verified
      if (user.isEmailVerified) {
        return {
          success: false,
          error: {
            message: 'Email is already verified',
            code: 'EMAIL_ALREADY_VERIFIED',
            statusCode: 400,
          },
        };
      }

      // Generate new verification token and save
      await UserServiceDatabase.generateAndSaveEmailToken(user);

      return UserServiceResponseHelpers.createSuccessResponse();
    } catch (error) {
      if (error instanceof UserServiceError) {
        return UserServiceResponseHelpers.createErrorResponse(error);
      }

      return UserServiceResponseHelpers.handleCustomError(
        error,
        'Failed to resend verification email',
        'VERIFICATION_EMAIL_FAILED'
      );
    }
  }
}
