import { MongoMemoryServer } from 'mongodb-memory-server';
import User, { ClerkUserData } from '../User';
import {
  setupUserTestEnvironment,
  setupUserTestDatabase,
  cleanupUserTestDatabase,
  clearUserTestCollections,
  sampleClerkUserData,
  sampleClerkUserDataWithoutUsername,
  sampleClerkUserDataMinimal,
  sampleClerkUserDataForUpdate,
  sampleClerkUserDataUpdated,
  sampleClerkUserDataPartial,
  expectValidClerkUser,
  expectDefaultPreferences,
} from './user-test-utils';

// Setup test environment
setupUserTestEnvironment();

describe('User Model - Clerk Integration', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await setupUserTestDatabase();
  });

  afterAll(async () => {
    await cleanupUserTestDatabase(mongoServer);
  });

  beforeEach(async () => {
    await clearUserTestCollections();
  });

  describe('findByClerkId', () => {
    it('should find user by Clerk ID', async () => {
      await User.createClerkUser(sampleClerkUserData);
      const foundUser = await User.findByClerkId('clerk_123');

      expect(foundUser).toBeTruthy();
      expect(foundUser?.clerkId).toBe('clerk_123');
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
      // Create first user with email-based username
      const firstUserData: ClerkUserData = {
        clerkId: 'clerk_first',
        email: 'testuser@example.com',
        emailVerified: true,
      };
      await User.createClerkUser(firstUserData);

      // Create second user with same email prefix
      const secondUserData: ClerkUserData = {
        clerkId: 'clerk_second',
        email: 'testuser@different.com',
        emailVerified: true,
      };
      const secondUser = await User.createClerkUser(secondUserData);

      expect(secondUser.username).toBe('testuser1'); // Should have suffix
    });

    it('should throw error for duplicate Clerk ID', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_duplicate',
        email: 'test@example.com',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData);

      await expect(User.createClerkUser(clerkUserData)).rejects.toThrow(
        'User with this Clerk ID already exists'
      );
    });

    it('should set default preferences correctly', async () => {
      const user = await User.createClerkUser(sampleClerkUserDataMinimal);
      expectDefaultPreferences(user);
    });
  });

  describe('updateFromClerkData', () => {
    let existingUser: any;

    beforeEach(async () => {
      existingUser = await User.createClerkUser(sampleClerkUserDataForUpdate);
    });

    it('should update user data from Clerk', async () => {
      const updatedUser = await User.updateFromClerkData('clerk_update', sampleClerkUserDataUpdated);

      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('User');
      expect(updatedUser.imageUrl).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.syncStatus).toBe('active');
      expect(updatedUser.lastClerkSync).toBeDefined();
    });

    it('should preserve existing data when Clerk data is missing', async () => {
      const updatedUser = await User.updateFromClerkData('clerk_update', sampleClerkUserDataPartial);

      expect(updatedUser.email).toBe('newemail@example.com');
      expect(updatedUser.firstName).toBe('Original'); // Should preserve original
      expect(updatedUser.lastName).toBe('User'); // Should preserve original
      expect(updatedUser.isEmailVerified).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'non_existent',
        email: 'test@example.com',
        emailVerified: true,
      };

      await expect(User.updateFromClerkData('non_existent', clerkUserData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should update lastClerkSync timestamp', async () => {
      const originalSyncTime = existingUser.lastClerkSync;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedUser = await User.updateFromClerkData('clerk_update', sampleClerkUserDataPartial);

      expect(updatedUser.lastClerkSync.getTime()).toBeGreaterThan(originalSyncTime.getTime());
    });
  });

  describe('User Schema Validation', () => {
    it('should allow users without passwordHash for Clerk auth', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_no_password',
        email: 'nopass@example.com',
        emailVerified: true,
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.authProvider).toBe('clerk');
      expect(user.passwordHash).toBeUndefined();
    });

    it('should enforce unique Clerk IDs', async () => {
      const clerkUserData1: ClerkUserData = {
        clerkId: 'clerk_unique',
        email: 'user1@example.com',
        emailVerified: true,
      };

      const clerkUserData2: ClerkUserData = {
        clerkId: 'clerk_unique', // Same Clerk ID
        email: 'user2@example.com',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData1);

      await expect(User.createClerkUser(clerkUserData2)).rejects.toThrow();
    });
  });

  describe('Integration with Existing User Methods', () => {
    it('should work with existing findByEmail method', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_integration',
        email: 'integration@example.com',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData);
      const foundUser = await User.findByEmail('integration@example.com');

      expect(foundUser).toBeTruthy();
      expect(foundUser?.authProvider).toBe('clerk');
      expect(foundUser?.clerkId).toBe('clerk_integration');
    });

    it('should work with existing findByUsername method', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_username',
        email: 'username@example.com',
        username: 'testintegration',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData);
      const foundUser = await User.findByUsername('testintegration');

      expect(foundUser).toBeTruthy();
      expect(foundUser?.authProvider).toBe('clerk');
      expect(foundUser?.clerkId).toBe('clerk_username');
    });

    it('should have proper sync status tracking', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_sync',
        email: 'sync@example.com',
        emailVerified: true,
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.syncStatus).toBe('active');
      expect(user.lastClerkSync).toBeInstanceOf(Date);
    });
  });
});