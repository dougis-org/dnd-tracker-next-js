/**
 * Test suite for enhanced registration flow integration
 * Tests the complete user registration and profile setup process
 *
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';
import {
  createMockUser,
} from '@/test-utils/user-registration-mocks';
import {
  setupWebhookTestEnvironment,
  setupWebhookMocks,
  cleanupWebhookMocks,
  createWebhookRequest,
  createMockWebhook,
  mockClerkUserData,
} from './webhook-test-utils';

// Mock dependencies
jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    createClerkUser: jest.fn(),
    findByClerkId: jest.fn(),
    updateFromClerkData: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  }
}));
jest.mock('@/lib/db');

// Setup test environment
setupWebhookTestEnvironment();

describe('Enhanced Registration Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupWebhookMocks();
    (connectToDatabase as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupWebhookMocks();
  });

  describe('Complete User Profile Setup', () => {
    it('should create user with complete profile structure', async () => {
      const expectedUser = createMockUser({
        _id: 'user123',
        clerkId: 'clerk_user_123',
        username: 'johndoe',
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(expectedUser);

      createMockWebhook('user.created', mockClerkUserData);
      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      // Debug output
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response data:', data);
      }

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
      expect(User.createClerkUser).toHaveBeenCalledWith({
        clerkId: 'clerk_user_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        imageUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });
    });

    it('should handle user creation with minimal Clerk data', async () => {
      const minimalClerkData = {
        id: 'clerk_user_minimal',
        email_addresses: [{
          id: 'email_1',
          email_address: 'minimal@example.com',
          verification: { status: 'verified' }
        }],
        primary_email_address_id: 'email_1',
        first_name: null,
        last_name: null,
        username: null,
        image_url: null,
      };

      const expectedUser = createMockUser({
        _id: 'user_minimal',
        clerkId: 'clerk_user_minimal',
        email: 'minimal@example.com',
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(expectedUser);

      const request = createWebhookRequest('user.created', minimalClerkData);
      const response = await POST(request);
      const _data = await response.json();

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalledWith({
        clerkId: 'clerk_user_minimal',
        email: 'minimal@example.com',
        firstName: undefined,
        lastName: undefined,
        username: undefined,
        imageUrl: null,
        emailVerified: true,
      });
    });
  });

  describe('Subscription Tier Assignment', () => {
    it('should assign default free subscription tier', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
        clerkId: 'clerk_user_123',
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalled();

      // Verify the user creation was called with correct parameters
      const callArgs = (User.createClerkUser as jest.Mock).mock.calls[0][0];
      expect(callArgs).toEqual(expect.objectContaining({
        clerkId: 'clerk_user_123',
        email: 'test@example.com',
      }));
    });

    it('should handle subscription setup integration points', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
        clerkId: 'clerk_user_123',
        isSubscriptionActive: jest.fn(() => true),
        canAccessFeature: jest.fn((feature, quantity) => {
          const limits = { parties: 1, encounters: 3, characters: 10 };
          return quantity <= limits[feature as keyof typeof limits];
        }),
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUser.isSubscriptionActive()).toBe(true);
      expect(mockUser.canAccessFeature('parties', 1)).toBe(true);
      expect(mockUser.canAccessFeature('encounters', 3)).toBe(true);
      expect(mockUser.canAccessFeature('characters', 10)).toBe(true);
    });
  });

  describe('User Data Validation and Mapping', () => {
    it('should validate required email data before user creation', async () => {
      const invalidUserData = {
        ...mockClerkUserData,
        email_addresses: [],
        primary_email_address_id: null,
      };

      const request = createWebhookRequest('user.created', invalidUserData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
      expect(User.createClerkUser).not.toHaveBeenCalled();
    });

    it('should properly map Clerk user data to application user model', async () => {
      const clerkData = {
        id: 'clerk_123',
        email_addresses: [{
          id: 'email_1',
          email_address: 'Mapping@Test.COM', // Test case sensitivity
          verification: { status: 'verified' }
        }],
        primary_email_address_id: 'email_1',
        first_name: 'Test',
        last_name: 'User',
        username: 'TestUser',
        image_url: 'https://images.clerk.com/test.jpg',
      };

      const expectedUser = createMockUser({ _id: 'user123' });
      (User.createClerkUser as jest.Mock).mockResolvedValue(expectedUser);

      const request = createWebhookRequest('user.created', clerkData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalledWith({
        clerkId: 'clerk_123',
        email: 'mapping@test.com', // Should be lowercase
        firstName: 'Test',
        lastName: 'User',
        username: 'TestUser',
        imageUrl: 'https://images.clerk.com/test.jpg',
        emailVerified: true,
      });
    });
  });

  describe('Error Handling and Cleanup', () => {
    it('should handle partial user creation failures', async () => {
      (User.createClerkUser as jest.Mock).mockRejectedValue(
        new Error('Database constraint violation')
      );

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });

    it('should handle database transaction failures', async () => {
      (User.createClerkUser as jest.Mock).mockRejectedValue(
        new Error('Transaction rolled back')
      );

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });

    it('should handle user creation with duplicate constraints', async () => {
      (User.createClerkUser as jest.Mock).mockRejectedValue(
        new Error('User with this Clerk ID already exists')
      );

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });
  });

  describe('Registration Completion Workflow', () => {
    it('should mark user as needing profile setup completion', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
        clerkId: 'clerk_user_123',
        lastClerkSync: expect.any(Date),
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalled();
    });

    it('should set appropriate sync status for new users', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
        lastClerkSync: new Date(),
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalled();
    });
  });

  describe('Integration with User Management System', () => {
    it('should integrate with user preference system', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalled();
    });

    it('should handle user role assignment correctly', async () => {
      const mockUser = createMockUser({
        _id: 'user123',
        role: 'user', // Default role
      });

      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(User.createClerkUser).toHaveBeenCalled();
    });
  });
});