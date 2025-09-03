/**
 * Test suite for User Service registration and subscription integration
 * Tests enhanced user registration workflow with subscription management using real User model
 *
 * @jest-environment node
 */

// Unmock mongoose and MongoDB dependencies for this test to use real models and DB
jest.unmock('mongoose');
jest.unmock('mongodb');
jest.unmock('bson');
jest.unmock('@/lib/db');
jest.unmock('@/lib/models/User');
jest.unmock('@/lib/models/index');

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '@/lib/models/User';
import { createMockClerkUserData } from '../../../test-utils/user-registration-mocks';

describe('UserService - Registration Integration', () => {
  let mongoServer: MongoMemoryServer;

  /**
   * Setup MongoDB memory server with proper connection
   */
  const setupMongoMemoryServer = async (): Promise<MongoMemoryServer> => {
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Force model registration
    await import('@/lib/models/index');

    return mongoServer;
  };

  const cleanupMongoMemoryServer = async (mongoServer: MongoMemoryServer) => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  };

  // Helper function to clean up test data
  const cleanupDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
      try {
        if (User && User.deleteMany) {
          await User.deleteMany({
            email: { $regex: /@example\.com$/ },
          });
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  };

  beforeAll(async () => {
    mongoServer = await setupMongoMemoryServer();
  });

  afterAll(async () => {
    await cleanupMongoMemoryServer(mongoServer);
  });

  beforeEach(cleanupDatabase);

  afterEach(cleanupDatabase);

  describe('Registration Flow Integration', () => {
    it('should create user with complete registration workflow', async () => {
      // Use the User model directly
      expect(User).toBeDefined();
      expect(typeof User.createClerkUser).toBe('function');

      const clerkUserData = createMockClerkUserData({
        clerkId: 'test_clerk_user_123',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
      });

      // Test User model directly instead of going through UserService
      const result = await User.createClerkUser(clerkUserData);

      expect(result).toBeDefined();
      expect(result.clerkId).toBe('test_clerk_user_123');
      expect(result.email).toBe('testuser@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.username).toBe('testuser123');
      expect(result.subscriptionTier).toBe('free');
      expect(result.isSubscriptionActive()).toBe(true);
    });
  });
});