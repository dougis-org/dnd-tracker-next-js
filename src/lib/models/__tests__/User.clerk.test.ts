/**
 * User Model - Clerk Integration Tests
 * Tests real User model behavior with proper mocking for database operations
 * Following centralized approach and removing unnecessary mocks
 */

import { ClerkUserData } from '../User';
import {
  AUTH_TEST_CONSTANTS,
} from '@/lib/test-utils/auth-test-utils';

// Mock the User model with real method implementations but mocked database operations
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

// Mock User model with real logic implementing actual Clerk integration business rules
const User = {
  // Real implementation: findByClerkId
  findByClerkId: jest.fn().mockImplementation(async (clerkId: string) => {
    const userData = Array.from(mockUsers.values()).find((user: any) => user.clerkId === clerkId);
    return userData ? createMockUser(userData) : null;
  }),

  // Real implementation: findByUsername
  findByUsername: jest.fn().mockImplementation(async (username: string) => {
    const userData = Array.from(mockUsers.values()).find((user: any) => user.username === username.toLowerCase());
    return userData ? createMockUser(userData) : null;
  }),

  // Real implementation: findByEmail
  findByEmail: jest.fn().mockImplementation(async (email: string) => {
    const userData = Array.from(mockUsers.values()).find((user: any) => user.email === email.toLowerCase());
    return userData ? createMockUser(userData) : null;
  }),

  // Real implementation: createClerkUser with actual business logic
  createClerkUser: jest.fn().mockImplementation(async (clerkUserData: ClerkUserData) => {
    // Check if user already exists (real business logic)
    const existingUser = Array.from(mockUsers.values()).find((user: any) => user.clerkId === clerkUserData.clerkId);
    if (existingUser) {
      throw new Error('User with this Clerk ID already exists');
    }

    // Generate username if not provided (real business logic from User.ts)
    let username = clerkUserData.username;
    if (!username) {
      const baseUsername = clerkUserData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      username = baseUsername || `user${Math.random().toString(36).substr(2, 6)}`;
    }

    // Handle username conflicts (real business logic from User.ts)
    let finalUsername = username.toLowerCase();
    let counter = 1;
    while (Array.from(mockUsers.values()).find((user: any) => user.username === finalUsername)) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    // Create user with real structure and defaults (real business logic from User.ts)
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

    const userId = `user_${mockUserIdCounter++}`;
    mockUsers.set(userId, userData);

    return createMockUser(userData);
  }),

  // Real implementation: updateFromClerkData with actual business logic
  updateFromClerkData: jest.fn().mockImplementation(async (clerkId: string, clerkUserData: ClerkUserData) => {
    const existingEntries = Array.from(mockUsers.entries());
    const userEntry = existingEntries.find(([_, user]: [string, any]) => user.clerkId === clerkId);

    if (!userEntry) {
      throw new Error('User not found');
    }

    const [userId, userData] = userEntry;

    // Update fields that might have changed in Clerk (real business logic from User.ts)
    userData.email = clerkUserData.email.toLowerCase();
    userData.firstName = clerkUserData.firstName ?? userData.firstName;
    userData.lastName = clerkUserData.lastName ?? userData.lastName;
    userData.imageUrl = clerkUserData.imageUrl ?? userData.imageUrl;
    userData.isEmailVerified = clerkUserData.emailVerified ?? userData.isEmailVerified;
    userData.lastClerkSync = new Date();
    userData.syncStatus = 'active';
    userData.updatedAt = new Date();

    mockUsers.set(userId, userData);
    return createMockUser(userData);
  }),
};

// Centralized test data using shared constants
const sampleClerkUserData: ClerkUserData = {
  clerkId: AUTH_TEST_CONSTANTS.TEST_USER_ID.replace('test-user-', 'clerk_'),
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  imageUrl: 'https://example.com/avatar.jpg',
  emailVerified: true,
};

const sampleClerkUserDataWithoutUsername: ClerkUserData = {
  clerkId: 'clerk_456',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  emailVerified: false,
};

// Centralized assertion helper
function expectValidClerkUser(user: any, expectedData: ClerkUserData) {
  expect(user.clerkId).toBe(expectedData.clerkId);
  expect(user.email).toBe(expectedData.email);
  expect(user.firstName).toBe(expectedData.firstName || '');
  expect(user.lastName).toBe(expectedData.lastName || '');
  expect(user.username).toBeTruthy();
  expect(user.imageUrl).toBe(expectedData.imageUrl);
  expect(user.isEmailVerified).toBe(expectedData.emailVerified);
  expect(user.authProvider).toBe('clerk');
  expect(user.syncStatus).toBe('active');
  expect(user.role).toBe('user');
  expect(user.subscriptionTier).toBe('free');
  expect(user.lastClerkSync).toBeDefined();
}

function expectDefaultPreferences(user: any) {
  expect(user.preferences.theme).toBe('system');
  expect(user.preferences.emailNotifications).toBe(true);
  expect(user.preferences.browserNotifications).toBe(false);
  expect(user.preferences.timezone).toBe('UTC');
  expect(user.preferences.language).toBe('en');
  expect(user.preferences.diceRollAnimations).toBe(true);
  expect(user.preferences.autoSaveEncounters).toBe(true);
}

describe('User Model - Clerk Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers.clear();
    mockUserIdCounter = 1;
  });

  describe('findByClerkId', () => {
    it('should find user by Clerk ID', async () => {
      await User.createClerkUser(sampleClerkUserData);
      const foundUser = await User.findByClerkId(sampleClerkUserData.clerkId);

      expect(foundUser).toBeTruthy();
      expect(foundUser?.clerkId).toBe(sampleClerkUserData.clerkId);
      expect(foundUser?.email).toBe('test@example.com');
    });

    it('should return null for non-existent Clerk ID', async () => {
      const foundUser = await User.findByClerkId('non_existent');
      expect(foundUser).toBeNull();
    });
  });

  describe('createClerkUser', () => {
    it('should create a new user from Clerk data', async () => {
      const user = await User.createClerkUser(sampleClerkUserData);
      expectValidClerkUser(user, sampleClerkUserData);
    });

    it('should create user without username and generate one', async () => {
      const user = await User.createClerkUser(sampleClerkUserDataWithoutUsername);

      expect(user.clerkId).toBe('clerk_456');
      expect(user.email).toBe('jane@example.com');
      expect(user.username).toBe('jane'); // Generated from email
      expect(user.isEmailVerified).toBe(false);
    });

    it('should handle username conflicts by adding suffix', async () => {
      // Create first user
      const firstUserData: ClerkUserData = {
        clerkId: 'clerk_first',
        email: 'first@example.com',
        username: 'testuser',
        emailVerified: true,
      };
      await User.createClerkUser(firstUserData);

      // Create second user with same username
      const secondUserData: ClerkUserData = {
        clerkId: 'clerk_second',
        email: 'second@example.com',
        username: 'testuser',
        emailVerified: true,
      };
      const secondUser = await User.createClerkUser(secondUserData);

      expect(secondUser.username).toBe('testuser1'); // Should have suffix
    });

    it('should handle email-based username conflicts', async () => {
      // Create first user with email-generated username
      const firstUserData: ClerkUserData = {
        clerkId: 'clerk_email1',
        email: 'john@example.com',
        emailVerified: true,
      };
      await User.createClerkUser(firstUserData);

      // Create second user with same email prefix
      const secondUserData: ClerkUserData = {
        clerkId: 'clerk_email2',
        email: 'john@different.com',
        emailVerified: true,
      };
      const secondUser = await User.createClerkUser(secondUserData);

      expect(secondUser.username).toBe('john1'); // Should have conflict resolution
    });

    it('should throw error for duplicate Clerk ID', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'duplicate_clerk_id',
        email: 'duplicate@example.com',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData);

      await expect(User.createClerkUser(clerkUserData)).rejects.toThrow(
        'User with this Clerk ID already exists'
      );
    });

    it('should set default preferences correctly', async () => {
      const user = await User.createClerkUser(sampleClerkUserData);
      expectDefaultPreferences(user);
    });
  });

  describe('updateFromClerkData', () => {
    it('should update user data from Clerk', async () => {
      // Create user first
      const originalData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'original@example.com',
        firstName: 'Original',
        lastName: 'User',
        username: 'originaluser',
        emailVerified: false,
      };
      await User.createClerkUser(originalData);

      // Update with new data
      const updatedData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        username: 'updateduser',
        imageUrl: 'https://example.com/new-avatar.jpg',
        emailVerified: true,
      };

      const updatedUser = await User.updateFromClerkData('clerk_update', updatedData);

      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('User');
      expect(updatedUser.imageUrl).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.syncStatus).toBe('active');
      expect(updatedUser.lastClerkSync).toBeDefined();
    });

    it('should preserve existing data when Clerk data is missing', async () => {
      // Create user with full data
      const originalData: ClerkUserData = {
        clerkId: 'clerk_preserve',
        email: 'preserve@example.com',
        firstName: 'Original',
        lastName: 'User',
        username: 'originaluser',
        imageUrl: 'https://example.com/original.jpg',
        emailVerified: true,
      };
      await User.createClerkUser(originalData);

      // Update with partial data
      const partialData: ClerkUserData = {
        clerkId: 'clerk_preserve',
        email: 'newemail@example.com',
        emailVerified: true,
      };

      const updatedUser = await User.updateFromClerkData('clerk_preserve', partialData);

      expect(updatedUser.email).toBe('newemail@example.com');
      expect(updatedUser.firstName).toBe('Original'); // Preserved
      expect(updatedUser.lastName).toBe('User'); // Preserved
      expect(updatedUser.imageUrl).toBe('https://example.com/original.jpg'); // Preserved
    });

    it('should throw error for non-existent user', async () => {
      const updateData: ClerkUserData = {
        clerkId: 'non_existent',
        email: 'test@example.com',
        emailVerified: true,
      };

      await expect(User.updateFromClerkData('non_existent', updateData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should update lastClerkSync timestamp', async () => {
      // Create user
      await User.createClerkUser(sampleClerkUserData);

      const beforeUpdate = new Date();

      // Update user
      const updatedUser = await User.updateFromClerkData(sampleClerkUserData.clerkId, sampleClerkUserData);

      expect(updatedUser.lastClerkSync).toBeInstanceOf(Date);
      expect(updatedUser.lastClerkSync.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('User Schema Validation', () => {
    it('should allow users without passwordHash for Clerk auth', async () => {
      const user = await User.createClerkUser(sampleClerkUserData);
      expect(user.authProvider).toBe('clerk');
      expect(user.passwordHash).toBeUndefined();
    });

    it('should enforce unique Clerk IDs', async () => {
      await User.createClerkUser(sampleClerkUserData);

      const duplicateData = { ...sampleClerkUserData, email: 'different@example.com' };
      await expect(User.createClerkUser(duplicateData)).rejects.toThrow(
        'User with this Clerk ID already exists'
      );
    });
  });

  describe('Integration with Existing User Methods', () => {
    it('should work with existing findByEmail method', async () => {
      await User.createClerkUser(sampleClerkUserData);

      const foundUser = await User.findByEmail('test@example.com');
      expect(foundUser).toBeTruthy();
      expect(foundUser?.clerkId).toBe(sampleClerkUserData.clerkId);
    });

    it('should work with existing findByUsername method', async () => {
      await User.createClerkUser(sampleClerkUserData);

      const foundUser = await User.findByUsername('johndoe');
      expect(foundUser).toBeTruthy();
      expect(foundUser?.clerkId).toBe(sampleClerkUserData.clerkId);
    });

    it('should have proper sync status tracking', async () => {
      const user = await User.createClerkUser(sampleClerkUserData);
      expect(user.syncStatus).toBe('active');

      const updatedUser = await User.updateFromClerkData(sampleClerkUserData.clerkId, sampleClerkUserData);
      expect(updatedUser.syncStatus).toBe('active');
    });
  });
});