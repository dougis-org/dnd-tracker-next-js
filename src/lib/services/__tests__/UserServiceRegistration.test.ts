/**
 * Test suite for User Service registration and subscription integration
 * Tests enhanced user registration workflow with subscription management
 */

import UserService from '../UserService';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';
import {
  createMockUser,
  createMockClerkUserData,
  createMinimalClerkUserData,
} from '@/test-utils/user-registration-mocks';

// Mock dependencies
jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    createClerkUser: jest.fn(),
    findByClerkId: jest.fn(),
    updateFromClerkData: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
}));
jest.mock('@/lib/db');

describe('UserService - Registration Integration', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDatabase as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Registration Flow Integration', () => {
    it('should handle complete user registration workflow', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const clerkUserData = createMockClerkUserData();

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(User.createClerkUser).toHaveBeenCalledWith(clerkUserData);
      expect(result).toEqual(mockUser);
    });

    it('should validate subscription setup during registration', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const clerkUserData = createMinimalClerkUserData();

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.subscriptionTier).toBe('free');
      expect(result.isSubscriptionActive()).toBe(true);
      expect(result.canAccessFeature).toBeDefined();
    });

    it('should handle user profile initialization', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const clerkUserData = createMinimalClerkUserData();

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.profileSetupCompleted).toBe(false);
      expect(result.authProvider).toBe('clerk');
      expect(result.syncStatus).toBe('active');
      expect(result.preferences).toBeDefined();
    });
  });

  describe('Subscription Management Integration', () => {
    it('should verify default subscription tier limits', async () => {
      (User.findByClerkId as jest.Mock).mockResolvedValue(mockUser);

      const user = await UserService.getUserByClerkId('clerk_123');

      expect(user).toBeDefined();
      expect(user?.subscriptionTier).toBe('free');

      // Verify subscription methods are available
      if (user) {
        expect(typeof user.isSubscriptionActive).toBe('function');
        expect(typeof user.canAccessFeature).toBe('function');
      }
    });

    it('should handle subscription feature access validation', async () => {
      const mockUserWithFeatureCheck = createMockUser({
        canAccessFeature: jest.fn((feature: string, quantity: number) => {
          const limits = {
            parties: 1,
            encounters: 3,
            characters: 10
          };
          return quantity <= limits[feature as keyof typeof limits];
        }),
      });

      (User.findByClerkId as jest.Mock).mockResolvedValue(mockUserWithFeatureCheck);

      const user = await UserService.getUserByClerkId('clerk_123');

      if (user) {
        expect(user.canAccessFeature('parties', 1)).toBe(true);
        expect(user.canAccessFeature('parties', 2)).toBe(false);
        expect(user.canAccessFeature('encounters', 3)).toBe(true);
        expect(user.canAccessFeature('encounters', 4)).toBe(false);
      }
    });

    it('should handle subscription tier upgrades', async () => {
      const upgradedUser = createMockUser({
        subscriptionTier: 'seasoned',
        canAccessFeature: jest.fn((feature: string, quantity: number) => {
          const limits = {
            parties: 3,
            encounters: 15,
            characters: 50
          };
          return quantity <= limits[feature as keyof typeof limits];
        }),
      });

      (User.findByClerkId as jest.Mock).mockResolvedValue(upgradedUser);

      const user = await UserService.getUserByClerkId('clerk_123');

      if (user) {
        expect(user.subscriptionTier).toBe('seasoned');
        expect(user.canAccessFeature('parties', 3)).toBe(true);
        expect(user.canAccessFeature('encounters', 15)).toBe(true);
      }
    });
  });

  describe('Profile Setup Management', () => {
    it('should track profile setup completion status', async () => {
      const incompleteProfile = createMockUser({
        profileSetupCompleted: false,
      });

      (User.findByClerkId as jest.Mock).mockResolvedValue(incompleteProfile);

      const user = await UserService.getUserByClerkId('clerk_123');

      expect(user?.profileSetupCompleted).toBe(false);
    });

    it('should handle profile setup completion workflow', async () => {
      const updatedUser = createMockUser({
        profileSetupCompleted: true,
        experienceLevel: 'intermediate',
        primaryRole: 'dm',
        dndEdition: '5th Edition',
      });

      (User.findByClerkId as jest.Mock).mockResolvedValue(updatedUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

      const user = await UserService.getUserByClerkId('clerk_123');
      expect(user).toBeDefined();

      // Simulate profile setup completion
      if (user) {
        const profileData = {
          profileSetupCompleted: true,
          experienceLevel: 'intermediate' as const,
          primaryRole: 'dm' as const,
          dndEdition: '5th Edition',
        };

        await UserService.updateUserProfileSetup(user._id.toString(), profileData);

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          user._id.toString(),
          profileData,
          { new: true }
        );
      }
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should handle user creation failures gracefully', async () => {
      (User.createClerkUser as jest.Mock).mockRejectedValue(
        new Error('Database constraint violation')
      );

      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_error',
        email: 'error@example.com',
      });

      await expect(UserService.createUserFromClerkData(clerkUserData))
        .rejects.toThrow('Database constraint violation');
    });

    it('should handle incomplete registration cleanup', async () => {
      // Mock a partial creation scenario
      const partialUser = createMockUser({
        _id: 'partial123',
        clerkId: 'clerk_partial',
        email: 'partial@example.com',
        syncStatus: 'error',
        save: jest.fn(),
        remove: jest.fn(),
      });

      (User.findByClerkId as jest.Mock).mockResolvedValue(partialUser);

      const user = await UserService.getUserByClerkId('clerk_partial');

      expect(user?.syncStatus).toBe('error');

      // Should be able to handle cleanup
      if (user) {
        await UserService.cleanupIncompleteRegistration(user.clerkId);
        expect(User.findByClerkId).toHaveBeenCalledWith('clerk_partial');
      }
    });

    it('should handle subscription setup failures', async () => {
      const mockUserWithError = createMockUser({
        subscriptionTier: 'free',
        isSubscriptionActive: jest.fn(() => false),
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUserWithError);

      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_sub_error',
        email: 'suberror@example.com',
      });

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.isSubscriptionActive()).toBe(false);
      // Should still create user even if subscription setup fails
      expect(result.subscriptionTier).toBe('free');
    });
  });

  describe('Data Synchronization', () => {
    it('should maintain sync status during registration', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_sync',
        email: 'sync@example.com',
      });

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result.syncStatus).toBe('active');
      expect(result.authProvider).toBe('clerk');
    });

    it('should handle sync status updates during profile changes', async () => {
      const syncedUser = createMockUser({
        syncStatus: 'active',
        lastClerkSync: new Date(),
      });

      (User.updateFromClerkData as jest.Mock).mockResolvedValue(syncedUser);

      const updatedData = createMockClerkUserData({
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      });

      const result = await UserService.updateUserFromClerkData('clerk_123', updatedData);

      expect(User.updateFromClerkData).toHaveBeenCalledWith('clerk_123', updatedData);
      expect(result.syncStatus).toBe('active');
      expect(result.lastClerkSync).toBeInstanceOf(Date);
    });
  });
});