/**
 * Test suite for User model registration and profile setup enhancements
 * Tests user creation with enhanced profile initialization
 */

import mongoose from 'mongoose';
import User, { ClerkUserData } from '../User';

// Mock database connection
jest.mock('@/lib/db');

describe('User Model - Registration Enhancement', () => {
  // Mock database connection
  beforeAll(async () => {
    // Use in-memory MongoDB for testing
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost/test-registration');
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await User.deleteMany({});
  });

  describe('Enhanced User Profile Creation', () => {
    it('should create user with complete default profile structure', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        imageUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.clerkId).toBe('clerk_123');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.username).toBe('johndoe');
      expect(user.subscriptionTier).toBe('free');
      expect(user.authProvider).toBe('clerk');
      expect(user.syncStatus).toBe('active');
      expect(user.profileSetupCompleted).toBe(false);
      expect(user.isEmailVerified).toBe(true);

      // Check preferences are properly initialized
      expect(user.preferences.theme).toBe('system');
      expect(user.preferences.emailNotifications).toBe(true);
      expect(user.preferences.browserNotifications).toBe(false);
      expect(user.preferences.timezone).toBe('UTC');
      expect(user.preferences.language).toBe('en');
      expect(user.preferences.diceRollAnimations).toBe(true);
      expect(user.preferences.autoSaveEncounters).toBe(true);
    });

    it('should handle user creation with minimal data', async () => {
      const minimalClerkUserData: ClerkUserData = {
        clerkId: 'clerk_minimal',
        email: 'minimal@example.com',
      };

      const user = await User.createClerkUser(minimalClerkUserData);

      expect(user.clerkId).toBe('clerk_minimal');
      expect(user.email).toBe('minimal@example.com');
      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.subscriptionTier).toBe('free');
      expect(user.authProvider).toBe('clerk');
      expect(user.syncStatus).toBe('active');
      expect(user.profileSetupCompleted).toBe(false);
      expect(user.isEmailVerified).toBe(false);

      // Username should be generated from email
      expect(user.username).toMatch(/^minimal\d*$/);
    });

    it('should generate unique usernames when conflicts occur', async () => {
      // Create first user
      const firstUserData: ClerkUserData = {
        clerkId: 'clerk_1',
        email: 'test@example.com',
        username: 'testuser',
      };
      await User.createClerkUser(firstUserData);

      // Create second user with same username
      const secondUserData: ClerkUserData = {
        clerkId: 'clerk_2',
        email: 'test2@example.com',
        username: 'testuser',
      };
      const user2 = await User.createClerkUser(secondUserData);

      expect(user2.username).toBe('testuser1');
    });
  });

  describe('Subscription Tier Management', () => {
    it('should assign default free tier to new users', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.subscriptionTier).toBe('free');
      expect(user.isSubscriptionActive()).toBe(true);
    });

    it('should properly check feature access limits', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const user = await User.createClerkUser(clerkUserData);

      // Free tier limits
      expect(user.canAccessFeature('parties', 1)).toBe(true);
      expect(user.canAccessFeature('parties', 2)).toBe(false);
      expect(user.canAccessFeature('encounters', 3)).toBe(true);
      expect(user.canAccessFeature('encounters', 4)).toBe(false);
      expect(user.canAccessFeature('characters', 10)).toBe(true);
      expect(user.canAccessFeature('characters', 11)).toBe(false);
    });
  });

  describe('Profile Setup Status Management', () => {
    it('should create users with profileSetupCompleted as false', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.profileSetupCompleted).toBe(false);
    });

    it('should track profile setup completion state', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const user = await User.createClerkUser(clerkUserData);

      // Simulate profile setup completion
      user.profileSetupCompleted = true;
      user.experienceLevel = 'intermediate';
      user.primaryRole = 'dm';
      user.dndEdition = '5th Edition';

      await user.save();

      const updatedUser = await User.findByClerkId('clerk_123');
      expect(updatedUser?.profileSetupCompleted).toBe(true);
      expect(updatedUser?.experienceLevel).toBe('intermediate');
      expect(updatedUser?.primaryRole).toBe('dm');
    });
  });

  describe('Sync Status Management', () => {
    it('should set active sync status for new users', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.syncStatus).toBe('active');
      expect(user.lastClerkSync).toBeInstanceOf(Date);
      expect(user.authProvider).toBe('clerk');
    });

    it('should properly update sync status during updates', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.createClerkUser(clerkUserData);
      const initialSyncTime = user.lastClerkSync;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update user data
      const updatedData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Smith', // Changed last name
        imageUrl: 'https://example.com/new-avatar.jpg',
      };

      const updatedUser = await User.updateFromClerkData('clerk_123', updatedData);

      expect(updatedUser.lastName).toBe('Smith');
      expect(updatedUser.imageUrl).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.syncStatus).toBe('active');
      expect(updatedUser.lastClerkSync).not.toEqual(initialSyncTime);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should prevent duplicate Clerk ID creation', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_duplicate',
        email: 'test1@example.com',
      };

      // Create first user
      await User.createClerkUser(clerkUserData);

      // Try to create second user with same Clerk ID
      const duplicateData: ClerkUserData = {
        clerkId: 'clerk_duplicate',
        email: 'test2@example.com',
      };

      await expect(User.createClerkUser(duplicateData))
        .rejects.toThrow('User with this Clerk ID already exists');
    });

    it('should handle email normalization correctly', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'Test.User+Tag@Example.COM',
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.email).toBe('test.user+tag@example.com');
    });

    it('should handle missing or null values gracefully', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: undefined,
        lastName: undefined,
        username: undefined,
        imageUrl: undefined,
        emailVerified: undefined,
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.imageUrl).toBeUndefined();
      expect(user.isEmailVerified).toBe(false);

      // Username should be generated from email
      expect(user.username).toMatch(/^test\d*$/);
    });
  });

  describe('User Data Integrity', () => {
    it('should maintain data integrity during concurrent operations', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_concurrent',
        email: 'concurrent@example.com',
      };

      // Simulate concurrent user creation attempts
      const promises = Array(5).fill(null).map(async (_, index) => {
        try {
          const userData = {
            ...clerkUserData,
            clerkId: `clerk_concurrent_${index}`,
            email: `concurrent${index}@example.com`,
          };
          return await User.createClerkUser(userData);
        } catch {
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const successfulCreations = results.filter(result =>
        result.status === 'fulfilled' && result.value !== null
      );

      expect(successfulCreations).toHaveLength(5);
    });

    it('should properly handle database connection errors', async () => {
      // Mock a database connection error
      const originalSave = User.prototype.save;
      User.prototype.save = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_db_error',
        email: 'dberror@example.com',
      };

      await expect(User.createClerkUser(clerkUserData))
        .rejects.toThrow('Database connection lost');

      // Restore original save method
      User.prototype.save = originalSave;
    });
  });
});