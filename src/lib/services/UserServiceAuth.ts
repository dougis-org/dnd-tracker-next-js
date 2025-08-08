import { connectToDatabase } from '../db';
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
   * Fixed for Issue #620: Improved error handling and model initialization
   */
  private static async createAndSaveUser(validatedData: any) {
    try {
      // Import User model after database connection is established
      const User = (await import('../models/User')).default;

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

      // Fix for Issue #620: Validate password was properly set before proceeding
      if (!newUser.passwordHash || newUser.passwordHash.length < 8) {
        throw new Error('Password validation failed during user creation');
      }

      // Only generate email verification token if bypass is not enabled
      if (!bypassEmailVerification) {
        await UserServiceDatabase.generateAndSaveEmailToken(newUser);
      } else {
        // Save user without generating email token when bypass is enabled
        await UserServiceDatabase.saveUserSafely(newUser);
      }

      // Fix for Issue #620: Verify user was actually saved and password hashed
      const savedUser = await User.findByEmail(validatedData.email);
      if (!savedUser || !savedUser.passwordHash.startsWith('$2')) {
        throw new Error('User creation failed - invalid password hash');
      }

      return savedUser; // Return the verified saved user
    } catch (error) {
      console.error('Error in createAndSaveUser:', error);
      throw error; // Re-throw to be handled by caller
    }
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
   * Fixed for Issue #620: Enhanced error handling, connection stability, and retry logic
   */
  static async authenticateUser(
    loginData: UserLogin
  ): Promise<
    ServiceResult<{ user: PublicUser; requiresVerification: boolean }>
  > {
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Fix for Issue #620: Ensure database connection with retry logic
        await connectToDatabase();

        // Validate input data
        const validatedData =
          UserServiceValidation.validateAndParseLogin(loginData);

        // Find user by email with enhanced retry logic for Issue #620
        const user = await this.findUserWithRetry(validatedData.email, attempt);

        if (!user) {
          console.warn(`Authentication failed: User not found for email ${validatedData.email} (attempt ${attempt})`);
          throw new InvalidCredentialsError();
        }

        // Fix for Issue #620: Enhanced user object and password hash validation
        const validationError = await this.validateUserAuthentication(user);
        if (validationError) {
          throw validationError;
        }

        // Verify password with enhanced error handling and retry
        const isPasswordValid = await this.verifyPasswordWithRetry(user, validatedData.password);
        if (!isPasswordValid) {
          console.warn(`Authentication failed: Invalid password for user ${user.email} (attempt ${attempt})`);
          throw new InvalidCredentialsError();
        }

        // Update last login timestamp with error handling
        try {
          await UserServiceDatabase.updateLastLogin(user);
        } catch (updateError) {
          console.warn(`Failed to update last login for user ${user.email}:`, updateError);
          // Don't fail authentication just because we couldn't update login time
        }

        // Fix for Issue #620: Final user state validation before returning success
        const finalUser = await UserServiceLookup.findUserByEmailNullable(validatedData.email);
        if (!finalUser) {
          console.error(`Critical: User disappeared during authentication for ${validatedData.email}`);
          throw new InvalidCredentialsError();
        }

        return UserServiceResponseHelpers.createSuccessResponse({
          user: UserServiceResponseHelpers.safeToPublicJSON(finalUser),
          requiresVerification: !finalUser.isEmailVerified,
        });
      } catch (error) {
        lastError = error;

        if (error instanceof InvalidCredentialsError) {
          // Don't retry for credential errors - they are definitive
          return UserServiceResponseHelpers.createErrorResponse(error);
        }

        // Log the error and check if we should retry
        console.warn(`Authentication attempt ${attempt} failed for email ${loginData.email}:`, error);

        if (attempt === maxRetries) {
          // Final attempt failed
          console.error(`All ${maxRetries} authentication attempts failed for email ${loginData.email}:`, error);
          break;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // All attempts failed - log the final error for debugging
    console.error(`Authentication failed after ${maxRetries} attempts:`, lastError);
    return {
      success: false,
      error: {
        message: 'Authentication temporarily unavailable. Please try again.',
        code: 'AUTHENTICATION_FAILED',
        statusCode: 503,
      },
    };
  }

  /**
   * Find user with retry logic for Issue #620
   * Enhanced database query reliability
   */
  private static async findUserWithRetry(email: string, attempt: number) {
    let user = await UserServiceLookup.findUserByEmailNullable(email);

    // Fix for Issue #620: Enhanced retry logic for database queries
    if (!user && attempt <= 2) {
      // Wait progressively longer and retry
      const waitTime = 50 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Force a fresh database connection
      await connectToDatabase();
      user = await UserServiceLookup.findUserByEmailNullable(email);
    }

    return user;
  }

  /**
   * Validate user authentication state for Issue #620
   * Comprehensive user object and password hash validation
   */
  private static async validateUserAuthentication(user: any): Promise<InvalidCredentialsError | null> {
    // Fix for Issue #620: Enhanced user object validation
    if (!user.email || !user._id) {
      console.error(`Authentication failed: Incomplete user object for ${user.email || 'unknown'}`);
      return new InvalidCredentialsError();
    }

    // Fix for Issue #620: Enhanced password hash validation
    if (!user.passwordHash) {
      console.error(`Authentication failed: Missing password hash for user ${user.email}`);
      return new InvalidCredentialsError();
    }

    if (typeof user.passwordHash !== 'string' || user.passwordHash.length < 10) {
      console.error(`Authentication failed: Invalid password hash length for user ${user.email}`);
      return new InvalidCredentialsError();
    }

    if (!user.passwordHash.startsWith('$2')) {
      console.error(`Authentication failed: Invalid password hash format for user ${user.email}`);
      return new InvalidCredentialsError();
    }

    // Fix for Issue #620: Check if comparePassword method exists
    if (typeof user.comparePassword !== 'function') {
      console.error(`Authentication failed: Missing comparePassword method for user ${user.email}`);
      return new InvalidCredentialsError();
    }

    return null;
  }

  /**
   * Verify password with retry logic for Issue #620
   * Enhanced password comparison with error handling
   */
  private static async verifyPasswordWithRetry(user: any, password: string): Promise<boolean> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isValid = await user.comparePassword(password);
        return isValid;
      } catch (passwordError) {
        console.error(`Password comparison error for user ${user.email} (attempt ${attempt}):`, passwordError);

        if (attempt === maxAttempts) {
          throw new InvalidCredentialsError();
        }

        // Brief wait before retry
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return false;
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
