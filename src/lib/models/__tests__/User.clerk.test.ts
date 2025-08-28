import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User, { ClerkUserData } from '../User';

// Setup test timeout
jest.setTimeout(30000);

describe('User Model - Clerk Integration', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('findByClerkId', () => {
    it('should find user by Clerk ID', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        imageUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      };

      await User.createClerkUser(clerkUserData);
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
      expect(user.imageUrl).toBe('https://example.com/avatar.jpg');
      expect(user.isEmailVerified).toBe(true);
      expect(user.authProvider).toBe('clerk');
      expect(user.syncStatus).toBe('active');
      expect(user.role).toBe('user');
      expect(user.subscriptionTier).toBe('free');
      expect(user.lastClerkSync).toBeDefined();
    });

    it('should create user without username and generate one', async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_456',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        emailVerified: false,
      };

      const user = await User.createClerkUser(clerkUserData);

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
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_prefs',
        email: 'prefs@example.com',
        emailVerified: true,
      };

      const user = await User.createClerkUser(clerkUserData);

      expect(user.preferences.theme).toBe('system');
      expect(user.preferences.emailNotifications).toBe(true);
      expect(user.preferences.browserNotifications).toBe(false);
      expect(user.preferences.timezone).toBe('UTC');
      expect(user.preferences.language).toBe('en');
      expect(user.preferences.diceRollAnimations).toBe(true);
      expect(user.preferences.autoSaveEncounters).toBe(true);
    });
  });

  describe('updateFromClerkData', () => {
    let existingUser: any;

    beforeEach(async () => {
      const clerkUserData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'original@example.com',
        firstName: 'Original',
        lastName: 'User',
        username: 'originaluser',
        emailVerified: false,
      };
      existingUser = await User.createClerkUser(clerkUserData);
    });

    it('should update user data from Clerk', async () => {
      const updatedClerkData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        username: 'updateduser',
        imageUrl: 'https://example.com/new-avatar.jpg',
        emailVerified: true,
      };

      const updatedUser = await User.updateFromClerkData('clerk_update', updatedClerkData);

      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('User');
      expect(updatedUser.imageUrl).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.syncStatus).toBe('active');
      expect(updatedUser.lastClerkSync).toBeDefined();
    });

    it('should preserve existing data when Clerk data is missing', async () => {
      const partialClerkData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'newemail@example.com',
        // firstName, lastName, etc. are missing
        emailVerified: true,
      };

      const updatedUser = await User.updateFromClerkData('clerk_update', partialClerkData);

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

      const updatedClerkData: ClerkUserData = {
        clerkId: 'clerk_update',
        email: 'updated@example.com',
        emailVerified: true,
      };

      const updatedUser = await User.updateFromClerkData('clerk_update', updatedClerkData);

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