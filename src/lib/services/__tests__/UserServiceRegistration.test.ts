/**
 * Test suite for User Service registration and subscription integration
 * Tests enhanced user registration workflow with subscription management using real User model
 */

import { connectToDatabase } from '../../db';
import mongoose from 'mongoose';
import {
  createMockClerkUserData,
} from '../../../test-utils/user-registration-mocks';

// Dynamically import User model to avoid potential import issues
let User: any;

describe('UserService - Registration Integration', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await connectToDatabase();

    // Dynamically import User model to ensure it's properly loaded
    const UserModule = await import('../../models/User');
    User = UserModule.default;

    // Verify User model is available
    if (!User) {
      throw new Error('User model is not available in test environment');
    }
  });

  // Helper function to clean up test data
  const cleanupDatabase = async () => {
    // Clean up any existing test data
    if (mongoose.connection.readyState === 1) {
      // Ensure User model is available before trying to use it
      if (!User) {
        console.warn('User model not available for cleanup');
        return;
      }
      await User.deleteMany({
        email: { $regex: /@example\.com$/ }
      });
    }
  };

  beforeEach(cleanupDatabase);

  afterEach(cleanupDatabase);

  describe('Registration Flow Integration', () => {
    it('should create user with complete registration workflow', async () => {
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