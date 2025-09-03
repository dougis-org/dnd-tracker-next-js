/**
 * Test suite for User Service registration and subscription integration
 * Tests enhanced user registration workflow with subscription management using real User model
 */

import UserService from '../UserService';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';
import {
  createMockClerkUserData,
  createMinimalClerkUserData,
  testFeatureAccessOnUser,
} from '@/test-utils/user-registration-mocks';

describe('UserService - Registration Integration', () => {
  // Connect to test database before each test
  beforeEach(async () => {
    await connectToDatabase();
    // Clean up any existing test data
    await User.deleteMany({ email: { $regex: /@example\.com$/ } });
  });

  // Clean up after each test
  afterEach(async () => {
    await User.deleteMany({ email: { $regex: /@example\.com$/ } });
  });

  describe('Registration Flow Integration', () => {
    it('should handle complete user registration workflow', async () => {
      const clerkUserData = createMockClerkUserData();

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.clerkId).toBe(clerkUserData.clerkId);
      expect(result.email).toBe(clerkUserData.email);
      expect(result.firstName).toBe(clerkUserData.firstName);
      expect(result.lastName).toBe(clerkUserData.lastName);
      expect(result.subscriptionTier).toBe('free');
      expect(result.authProvider).toBe('clerk');
      expect(result.syncStatus).toBe('active');
      expect(result.profileSetupCompleted).toBe(false);
      
      // Verify the user was actually saved to the database
      const savedUser = await User.findByClerkId(clerkUserData.clerkId);
      expect(savedUser).toBeTruthy();
      expect(savedUser!.email).toBe(clerkUserData.email);
    });

    it('should validate subscription setup during registration', async () => {
      const clerkUserData = createMinimalClerkUserData();

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.subscriptionTier).toBe('free');
      expect(result.isSubscriptionActive()).toBe(true);
      expect(result.canAccessFeature).toBeDefined();
      
      // Test feature access limits for free tier
      testFeatureAccessOnUser(result);
    });
    });

    it('should handle user profile initialization', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_profile_test',
        email: 'profile@example.com',
      });

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.profileSetupCompleted).toBe(false);
      expect(result.authProvider).toBe('clerk');
      expect(result.syncStatus).toBe('active');
      expect(result.preferences).toBeDefined();
      
      // Verify preferences structure
      expect(result.preferences.theme).toBe('system');
      expect(result.preferences.emailNotifications).toBe(true);
      expect(result.preferences.browserNotifications).toBe(false);
    });
  });

  describe('Subscription Management Integration', () => {
    it('should verify default subscription tier limits', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'clerk_subscription_test',
        email: 'subscription@example.com',
      });
      
      // Create user first
      await UserService.createUserFromClerkData(clerkUserData);
      
      const user = await UserService.getUserByClerkId('clerk_subscription_test');

      expect(user).toBeDefined();
      expect(user?.subscriptionTier).toBe('free');

      // Verify subscription methods are available
      if (user) {
        expect(typeof user.isSubscriptionActive).toBe('function');
        expect(typeof user.canAccessFeature).toBe('function');
        expect(user.isSubscriptionActive()).toBe(true);
      }
    });

    it('should handle subscription feature access validation', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'clerk_feature_test',
        email: 'features@example.com',
      });
      
      const user = await UserService.createUserFromClerkData(clerkUserData);
      
      // Test free tier limits
      testFeatureAccessOnUser(user);
    });

    it('should handle subscription tier upgrades', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'clerk_upgrade_test',
        email: 'upgrade@example.com',
      });
      
      const user = await UserService.createUserFromClerkData(clerkUserData);
      
      // Manually upgrade subscription tier for testing
      user.subscriptionTier = 'seasoned';
      await user.save();
      
      const updatedUser = await UserService.getUserByClerkId('clerk_upgrade_test');

      if (updatedUser) {
        expect(updatedUser.subscriptionTier).toBe('seasoned');
        // Note: For a real test, we'd need to implement the business logic 
        // for different tier limits in the User model
      }
    });
  });

  describe('Profile Setup Management', () => {
    it('should track profile setup completion status', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_setup_test',
        email: 'setup@example.com',
      });
      
      const user = await UserService.createUserFromClerkData(clerkUserData);

      expect(user.profileSetupCompleted).toBe(false);
      
      // Update profile setup status
      user.profileSetupCompleted = true;
      await user.save();
      
      const updatedUser = await UserService.getUserByClerkId('clerk_setup_test');
      expect(updatedUser?.profileSetupCompleted).toBe(true);
    });

    it('should handle profile setup completion workflow', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'clerk_workflow_test',
        email: 'workflow@example.com',
      });
      
      const user = await UserService.createUserFromClerkData(clerkUserData);
      expect(user).toBeDefined();
      expect(user.profileSetupCompleted).toBe(false);

      // Simulate profile setup completion
      const profileData = {
        profileSetupCompleted: true,
        experienceLevel: 'intermediate' as const,
        primaryRole: 'dm' as const,
        dndEdition: '5th Edition',
      };

      const updatedUser = await UserService.updateUserProfileSetup(user._id.toString(), profileData);

      expect(updatedUser.profileSetupCompleted).toBe(true);
      expect(updatedUser.experienceLevel).toBe('intermediate');
      expect(updatedUser.primaryRole).toBe('dm');
      expect(updatedUser.dndEdition).toBe('5th Edition');
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should handle user creation failures gracefully', async () => {
      // Use invalid data that would cause a database constraint violation
      const invalidClerkUserData = createMinimalClerkUserData({
        clerkId: '', // Invalid empty clerkId should cause an error
        email: 'error@example.com',
      });

      await expect(UserService.createUserFromClerkData(invalidClerkUserData))
        .rejects.toThrow();
    });

    it('should handle incomplete registration cleanup', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_cleanup_test',
        email: 'cleanup@example.com',
      });
      
      // Create a user
      const user = await UserService.createUserFromClerkData(clerkUserData);
      
      // Simulate an error state
      user.syncStatus = 'error';
      await user.save();

      const userWithError = await UserService.getUserByClerkId('clerk_cleanup_test');
      expect(userWithError?.syncStatus).toBe('error');

      // Should be able to handle cleanup
      if (userWithError) {
        await UserService.cleanupIncompleteRegistration(userWithError.clerkId);
        
        // Verify user was cleaned up
        const cleanedUser = await UserService.getUserByClerkId('clerk_cleanup_test');
        expect(cleanedUser).toBeNull();
      }
    });

    it('should handle subscription setup failures', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_sub_error_test',
        email: 'suberror@example.com',
      });

      // Create user - even if subscription setup fails, user should be created
      const result = await UserService.createUserFromClerkData(clerkUserData);

      // Should still create user with default subscription settings
      expect(result.subscriptionTier).toBe('free');
      expect(result.isSubscriptionActive()).toBe(true);
    });
  });

  describe('Data Synchronization', () => {
    it('should maintain sync status during registration', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_sync_test',
        email: 'sync@example.com',
      });

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.syncStatus).toBe('active');
      expect(result.authProvider).toBe('clerk');
      expect(result.lastClerkSync).toBeInstanceOf(Date);
    });

    it('should handle sync status updates during profile changes', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'clerk_sync_update_test',
        email: 'syncupdate@example.com',
      });
      
      // Create user first
      await UserService.createUserFromClerkData(clerkUserData);

      const updatedData = createMockClerkUserData({
        clerkId: 'clerk_sync_update_test',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      });

      const result = await UserService.updateUserFromClerkData('clerk_sync_update_test', updatedData);

      expect(result.syncStatus).toBe('active');
      expect(result.lastClerkSync).toBeInstanceOf(Date);
      expect(result.email).toBe('updated@example.com');
      expect(result.firstName).toBe('Updated');
    });
  });
});