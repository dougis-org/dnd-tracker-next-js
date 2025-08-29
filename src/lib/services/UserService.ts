import {
  type UserRegistration,
  type UserLogin,
  type UserProfileUpdate,
  type ChangePassword,
  type PasswordResetRequest,
  type PasswordReset,
  type EmailVerification,
  type PublicUser,
  type UserRegistrationResponse,
  type SubscriptionTier,
} from '../validations/user';

// Profile setup specific type
interface ProfileSetupData {
  profileSetupCompleted?: boolean;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryRole?: 'player' | 'dm' | 'both';
  dndEdition?: string;
}

import { ServiceResult } from './UserServiceErrors';
import { UserServiceAuth } from './UserServiceAuth';
import { UserServiceProfile } from './UserServiceProfile';
import {
  UserServiceStats,
  type PaginatedResult,
  type QueryFilters,
  type UserStats,
} from './UserServiceStats';
import User, { IUser, ClerkUserData } from '../models/User';

/**
 * User Service Layer for D&D Encounter Tracker
 *
 * Provides business logic for user management, authentication,
 * and account operations. Abstracts database operations from
 * API routes and provides consistent error handling.
 *
 * This class acts as a coordination layer, delegating operations
 * to specialized modules for better organization and maintainability.
 */
export class UserService {
  // ================================
  // Authentication Operations
  // ================================

  /**
   * Create a new user account
   */
  static async createUser(
    userData: UserRegistration
  ): Promise<ServiceResult<UserRegistrationResponse>> {
    return UserServiceAuth.createUser(userData);
  }

  /**
   * Authenticate user login
   */
  static async authenticateUser(
    loginData: UserLogin
  ): Promise<
    ServiceResult<{ user: PublicUser; requiresVerification: boolean }>
  > {
    return UserServiceAuth.authenticateUser(loginData);
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    passwordData: ChangePassword
  ): Promise<ServiceResult<void>> {
    return UserServiceAuth.changePassword(userId, passwordData);
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(
    resetData: PasswordResetRequest
  ): Promise<ServiceResult<{ token: string }>> {
    return UserServiceAuth.requestPasswordReset(resetData);
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    resetData: PasswordReset
  ): Promise<ServiceResult<void>> {
    return UserServiceAuth.resetPassword(resetData);
  }

  /**
   * Verify email address
   */
  static async verifyEmail(
    verificationData: EmailVerification
  ): Promise<ServiceResult<PublicUser>> {
    return UserServiceAuth.verifyEmail(verificationData);
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    email: string
  ): Promise<ServiceResult<void>> {
    return UserServiceAuth.resendVerificationEmail(email);
  }

  // ================================
  // Profile Management Operations
  // ================================

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<ServiceResult<PublicUser>> {
    return UserServiceProfile.getUserById(userId);
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(
    email: string
  ): Promise<ServiceResult<PublicUser>> {
    return UserServiceProfile.getUserByEmail(email);
  }

  /**
   * Update user profile - regular profile updates
   */
  static async updateUserProfile(
    userId: string,
    updateData: UserProfileUpdate
  ): Promise<ServiceResult<PublicUser>> {
    return UserServiceProfile.updateUserProfile(userId, updateData);
  }

  /**
   * Update user profile setup data - for onboarding flow
   */
  static async updateUserProfileSetup(
    userId: string,
    setupData: ProfileSetupData
  ): Promise<IUser | null> {
    try {
      const updatedUser = await User.findByIdAndUpdate(userId, setupData, { new: true });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user subscription tier
   */
  static async updateSubscription(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<ServiceResult<PublicUser>> {
    return UserServiceProfile.updateSubscription(userId, newTier);
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<ServiceResult<void>> {
    return UserServiceProfile.deleteUser(userId);
  }

  // ================================
  // Clerk Integration Operations
  // ================================

  /**
   * Create user from Clerk webhook data
   */
  static async createUserFromClerkData(clerkUserData: ClerkUserData): Promise<IUser> {
    return User.createClerkUser(clerkUserData);
  }

  /**
   * Update user from Clerk webhook data
   */
  static async updateUserFromClerkData(clerkId: string, clerkUserData: ClerkUserData): Promise<IUser> {
    return User.updateFromClerkData(clerkId, clerkUserData);
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkId: string): Promise<IUser | null> {
    return User.findByClerkId(clerkId);
  }

  /**
   * Clean up incomplete user registrations
   */
  static async cleanupIncompleteRegistration(clerkId: string): Promise<void> {
    const user = await User.findByClerkId(clerkId);
    if (user && user.syncStatus === 'error') {
      // Mark for cleanup - in a real implementation you might:
      // - Remove orphaned data
      // - Reset sync status
      // - Log the cleanup action
      user.syncStatus = 'pending';
      await user.save();
    }
  }

  // ================================
  // Administrative Operations
  // ================================

  /**
   * Get paginated list of users (admin only)
   */
  static async getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: QueryFilters
  ): Promise<ServiceResult<PaginatedResult<PublicUser>>> {
    return UserServiceStats.getUsers(page, limit, filters);
  }

  /**
   * Get user statistics (admin only)
   */
  static async getUserStats(): Promise<ServiceResult<UserStats>> {
    return UserServiceStats.getUserStats();
  }
}

// Default export
export default UserService;

// Re-export types for convenience
export type {
  PaginatedResult,
  UserStats,
  QueryFilters,
  PublicUser,
  SubscriptionTier,
  UserRegistration,
  UserLogin,
  UserProfileUpdate,
  ChangePassword,
  PasswordResetRequest,
  PasswordReset,
  EmailVerification,
};
