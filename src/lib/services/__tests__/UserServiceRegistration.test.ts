/**
 * Test suite for User Service registration and subscription integration
 * Tests enhanced user registration workflow with subscription management using real User model
 */

import UserService from '../UserService';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import {
  createMockClerkUserData,
  createMinimalClerkUserData,
} from '@/test-utils/user-registration-mocks';

// Function to get User model after ensuring it's loaded
async function getUserModel() {
  await connectToDatabase();
  
  // Try to get the model from mongoose registry
  let User;
  try {
    User = mongoose.model('User');
  } catch (error) {
    // If model isn't registered, import it
    const { default: UserModel } = await import('@/lib/models/User');
    User = UserModel;
  }
  
  if (!User) {
    throw new Error('User model could not be loaded');
  }
  
  return User;
}

describe('UserService - Registration Integration', () => {
  let User: any;

  beforeAll(async () => {
    // Ensure database connection is established and User model is loaded
    User = await getUserModel();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({
        email: { $regex: /@example\.com$/ }
      });
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({
        email: { $regex: /@example\.com$/ }
      });
    }
  });

  describe('Registration Flow Integration', () => {
    it('should create user with complete registration workflow', async () => {
      const clerkUserData = createMockClerkUserData({
        clerkId: 'test_clerk_user_123',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
      });

      const result = await UserService.createUserFromClerkData(clerkUserData);

      expect(result).toBeDefined();
      expect(result.clerkUserId).toBe('test_clerk_user_123');
      expect(result.email).toBe('testuser@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.username).toBe('testuser123');
      expect(result.subscriptionTier).toBe('free');
      expect(result.isSubscriptionActive()).toBe(true);
    });
  });
});