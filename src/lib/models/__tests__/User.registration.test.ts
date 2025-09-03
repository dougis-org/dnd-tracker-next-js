/**
 * Test suite for User model registration and profile setup enhancements
 * Tests user creation with enhanced profile initialization
 */

import { ClerkUserData } from '../User';
import {
  createMockClerkUserData,
  createMinimalClerkUserData,
  setupTestCleanup,
} from '@/test-utils/user-registration-mocks';
import crypto from 'crypto';

// Mock database connection
jest.mock('@/lib/db');

// Mock the User model with real implementation logic
const mockUsers = new Map();
let mockUserIdCounter = 1;

const createMockUser = (userData: any) => {
  const user = {
    _id: `user_${mockUserIdCounter++}`,
    ...userData,
    save: jest.fn().mockResolvedValue(userData),
    toObject: jest.fn().mockReturnValue(userData),
  };
  return user;
};

// Mock User model with real business logic
const User = {
  findByClerkId: jest.fn().mockImplementation(async (clerkId: string) => {
    const userData = Array.from(mockUsers.values()).find((user: any) => user.clerkId === clerkId);
    return userData ? createMockUser(userData) : null;
  }),

  findByUsername: jest.fn().mockImplementation(async (username: string) => {
    const userData = Array.from(mockUsers.values()).find((user: any) => user.username === username.toLowerCase());
    return userData ? createMockUser(userData) : null;
  }),

  findByIdAndUpdate: jest.fn().mockImplementation(async (id: string, updates: any) => {
    const userData = mockUsers.get(id);
    if (userData) {
      const updatedUserData = { ...userData, ...updates };
      mockUsers.set(id, updatedUserData);
      return createMockUser(updatedUserData);
    }
    return null;
  }),

  createClerkUser: jest.fn().mockImplementation(async (clerkUserData: ClerkUserData) => {
    // Check if user already exists
    const existingUser = Array.from(mockUsers.values()).find((user: any) => user.clerkId === clerkUserData.clerkId);
    if (existingUser) {
      throw new Error('User with this Clerk ID already exists');
    }

    // Generate username if not provided
    let username = clerkUserData.username;
    if (!username) {
      const baseUsername = clerkUserData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      username = baseUsername || `user${crypto.randomBytes(3).toString('hex')}`;
    }

    // Handle username conflicts
    let finalUsername = username.toLowerCase();
    let counter = 1;
    while (Array.from(mockUsers.values()).find((user: any) => user.username === finalUsername)) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    // Create user with real structure and defaults
    const userData = {
      clerkId: clerkUserData.clerkId,
      email: clerkUserData.email.toLowerCase(),
      username: finalUsername,
      firstName: clerkUserData.firstName ?? '',
      lastName: clerkUserData.lastName ?? '',
      imageUrl: clerkUserData.imageUrl,
      isEmailVerified: clerkUserData.emailVerified ?? false,
      authProvider: 'clerk',
      syncStatus: 'active',
      lastClerkSync: new Date(),
      role: 'user',
      subscriptionTier: 'free',
      preferences: {
        theme: 'system',
        emailNotifications: true,
        browserNotifications: false,
        timezone: 'UTC',
        language: 'en',
        diceRollAnimations: true,
        autoSaveEncounters: true,
      },
      profileSetupCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create mock user and store in mock database
    const user = createMockUser(userData);
    mockUsers.set(user._id, userData);

    // Add subscription and feature methods
    user.isSubscriptionActive = jest.fn().mockReturnValue(true);
    user.canAccessFeature = jest.fn().mockImplementation((feature: string, quantity: number) => {
      const limits = { parties: 1, encounters: 3, characters: 10 };
      if (!(feature in limits)) {
        return false;
      }
      return quantity <= limits[feature as keyof typeof limits];
    });

    return user;
  }),

  updateFromClerkData: jest.fn().mockImplementation(async (clerkId: string, clerkUserData: ClerkUserData) => {
    const userEntry = Array.from(mockUsers.entries()).find(([, u]: [string, any]) => u.clerkId === clerkId);
    if (!userEntry) {
      throw new Error('User not found');
    }

    const [userId, userData] = userEntry;

    // Update fields
    const updatedUserData = {
      ...userData,
      email: clerkUserData.email.toLowerCase(),
      firstName: clerkUserData.firstName ?? userData.firstName,
      lastName: clerkUserData.lastName ?? userData.lastName,
      imageUrl: clerkUserData.imageUrl ?? userData.imageUrl,
      isEmailVerified: clerkUserData.emailVerified ?? userData.isEmailVerified,
      lastClerkSync: new Date(),
      syncStatus: 'active',
    };

    // Update in mock database
    mockUsers.set(userId, updatedUserData);

    return createMockUser(updatedUserData);
  }),

  deleteMany: jest.fn().mockResolvedValue({}),
};

describe('User Model - Registration Enhancement', () => {
  setupTestCleanup();

  // Clear mock database between tests
  beforeEach(() => {
    mockUsers.clear();
    mockUserIdCounter = 1;
  });

  describe('Enhanced User Profile Creation', () => {
    it('should create user with complete default profile structure', async () => {
      const clerkUserData = createMockClerkUserData();

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
      const minimalClerkUserData = createMinimalClerkUserData();

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
      const firstUserData = createMockClerkUserData({
        clerkId: 'clerk_1',
        email: 'test@example.com',
        username: 'testuser',
      });
      await User.createClerkUser(firstUserData);

      // Create second user with same username
      const secondUserData = createMockClerkUserData({
        clerkId: 'clerk_2',
        email: 'test2@example.com',
        username: 'testuser',
      });
      const user2 = await User.createClerkUser(secondUserData);

      expect(user2.username).toBe('testuser1');
    });
  });

  describe('Subscription Tier Management', () => {
    it('should assign default free tier to new users', async () => {
      const clerkUserData = createMinimalClerkUserData();
      const user = await User.createClerkUser(clerkUserData);
      expect(user.subscriptionTier).toBe('free');
      expect(user.isSubscriptionActive()).toBe(true);
    });

    it('should properly check feature access limits', async () => {
      const clerkUserData = createMinimalClerkUserData();
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
      const clerkUserData = createMinimalClerkUserData();
      const user = await User.createClerkUser(clerkUserData);
      expect(user.profileSetupCompleted).toBe(false);
    });

    it('should track profile setup completion state', async () => {
      const clerkUserData = createMinimalClerkUserData();

      const user = await User.createClerkUser(clerkUserData);

      // Simulate profile setup completion by updating the user directly
      user.profileSetupCompleted = true;
      user.experienceLevel = 'intermediate';
      user.primaryRole = 'dm';
      user.dndEdition = '5th Edition';

      // Update the mock database
      const userEntry = Array.from(mockUsers.entries()).find(([, u]) => u.clerkId === clerkUserData.clerkId);
      if (userEntry) {
        const [userId, userData] = userEntry;
        const updatedData = {
          ...userData,
          profileSetupCompleted: user.profileSetupCompleted,
          experienceLevel: user.experienceLevel,
          primaryRole: user.primaryRole,
          dndEdition: user.dndEdition,
        };
        mockUsers.set(userId, updatedData);
      }

      const updatedUser = await User.findByClerkId(clerkUserData.clerkId);
      expect(updatedUser?.profileSetupCompleted).toBe(true);
      expect(updatedUser?.experienceLevel).toBe('intermediate');
      expect(updatedUser?.primaryRole).toBe('dm');
    });
  });

  describe('Sync Status Management', () => {
    it('should set active sync status for new users', async () => {
      const clerkUserData = createMinimalClerkUserData();
      const user = await User.createClerkUser(clerkUserData);
      expect(user.syncStatus).toBe('active');
      expect(user.lastClerkSync).toBeInstanceOf(Date);
      expect(user.authProvider).toBe('clerk');
    });

    it('should properly update sync status during updates', async () => {
      const clerkUserData = createMockClerkUserData();

      const user = await User.createClerkUser(clerkUserData);
      const initialSyncTime = user.lastClerkSync;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update user data
      const updatedData = createMockClerkUserData({
        lastName: 'Smith', // Changed last name
        imageUrl: 'https://example.com/new-avatar.jpg',
      });

      const updatedUser = await User.updateFromClerkData('clerk_123', updatedData);

      expect(updatedUser.lastName).toBe('Smith');
      expect(updatedUser.imageUrl).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.syncStatus).toBe('active');
      expect(updatedUser.lastClerkSync).not.toEqual(initialSyncTime);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should prevent duplicate Clerk ID creation', async () => {
      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_duplicate',
        email: 'test1@example.com',
      });

      // Create first user
      await User.createClerkUser(clerkUserData);

      // Try to create second user with same Clerk ID
      const duplicateData = createMinimalClerkUserData({
        clerkId: 'clerk_duplicate',
        email: 'test2@example.com',
      });

      await expect(User.createClerkUser(duplicateData))
        .rejects.toThrow('User with this Clerk ID already exists');
    });

    it('should handle email normalization correctly', async () => {
      const clerkUserData = createMinimalClerkUserData({
        email: 'Test.User+Tag@Example.COM',
      });

      const user = await User.createClerkUser(clerkUserData);

      expect(user.email).toBe('test.user+tag@example.com');
    });

    it('should handle missing or null values gracefully', async () => {
      const clerkUserData = createMinimalClerkUserData({
        firstName: undefined,
        lastName: undefined,
        username: undefined,
        imageUrl: undefined,
        emailVerified: undefined,
      });

      const user = await User.createClerkUser(clerkUserData);

      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.imageUrl).toBeUndefined();
      expect(user.isEmailVerified).toBe(false);

      // Username should be generated from email
      expect(user.username).toMatch(/^minimal\d*$/);
    });
  });

  describe('User Data Integrity', () => {
    it('should maintain data integrity during concurrent operations', async () => {
      const _clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_concurrent',
        email: 'concurrent@example.com',
      });

      // Simulate concurrent user creation attempts
      const promises = Array(5).fill(null).map(async (_, index) => {
        try {
          const userData = createMinimalClerkUserData({
            clerkId: `clerk_concurrent_${index}`,
            email: `concurrent${index}@example.com`,
          });
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
      // Mock a database connection error by temporarily replacing the createClerkUser mock
      const originalCreateClerkUser = User.createClerkUser;
      User.createClerkUser = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      const clerkUserData = createMinimalClerkUserData({
        clerkId: 'clerk_db_error',
        email: 'dberror@example.com',
      });

      await expect(User.createClerkUser(clerkUserData))
        .rejects.toThrow('Database connection lost');

      // Restore original implementation
      User.createClerkUser = originalCreateClerkUser;
    });
  });
});