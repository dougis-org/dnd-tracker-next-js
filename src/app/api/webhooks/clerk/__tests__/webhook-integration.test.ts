import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { POST } from '../route';
import User from '@/lib/models/User';
import { Webhook } from 'svix';

// Setup test timeout
jest.setTimeout(30000);

// Mock dependencies that don't need real implementations
jest.mock('svix');
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('/api/webhooks/clerk - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  const mockHeaders = {
    'svix-id': 'msg_test_id',
    'svix-timestamp': '1234567890',
    'svix-signature': 'v1,signature',
  };

  const mockClerkUserData = {
    id: 'clerk_user_123',
    first_name: 'John',
    last_name: 'Doe',
    username: 'johndoe',
    image_url: 'https://example.com/avatar.jpg',
    primary_email_address_id: 'email_123',
    email_addresses: [
      {
        id: 'email_123',
        email_address: 'test@example.com',
        verification: { status: 'verified' },
      },
    ],
  };

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
    jest.clearAllMocks();

    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Mock environment variable
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';

    // Mock headers function
    const mockHeadersFunction = require('next/headers').headers;
    mockHeadersFunction.mockResolvedValue({
      get: jest.fn((key: string) => mockHeaders[key as keyof typeof mockHeaders]),
    });
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  describe('User Created Event - Real Database', () => {
    beforeEach(() => {
      // Mock webhook verification to return user.created event
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should create a new user in MongoDB when webhook is received', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');

      // Verify user was actually created in MongoDB
      const createdUser = await User.findByClerkId('clerk_user_123');
      expect(createdUser).toBeTruthy();
      expect(createdUser?.email).toBe('test@example.com');
      expect(createdUser?.firstName).toBe('John');
      expect(createdUser?.lastName).toBe('Doe');
      expect(createdUser?.username).toBe('johndoe');
      expect(createdUser?.imageUrl).toBe('https://example.com/avatar.jpg');
      expect(createdUser?.isEmailVerified).toBe(true);
      expect(createdUser?.authProvider).toBe('clerk');
      expect(createdUser?.syncStatus).toBe('active');
      expect(createdUser?.subscriptionTier).toBe('free');
    });

    it('should generate username from email when username not provided', async () => {
      const userDataWithoutUsername = {
        ...mockClerkUserData,
        username: null,
        email_addresses: [
          {
            id: 'email_456',
            email_address: 'jane.smith@example.com',
            verification: { status: 'verified' },
          },
        ],
      };

      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: userDataWithoutUsername,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: userDataWithoutUsername }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const createdUser = await User.findByClerkId('clerk_user_123');
      expect(createdUser?.username).toBe('janesmith'); // Generated from email
    });

    it('should handle username conflicts by adding suffix', async () => {
      // Create first user with username 'johndoe'
      await User.createClerkUser({
        clerkId: 'existing_user',
        email: 'existing@example.com',
        username: 'johndoe',
        emailVerified: true,
      });

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const newUser = await User.findByClerkId('clerk_user_123');
      expect(newUser?.username).toBe('johndoe1'); // Should have suffix due to conflict
    });
  });

  describe('User Updated Event - Real Database', () => {
    let _existingUser: any;

    beforeEach(async () => {
      // Create existing user first
      _existingUser = await User.createClerkUser({
        clerkId: 'clerk_user_123',
        email: 'original@example.com',
        firstName: 'Original',
        lastName: 'User',
        emailVerified: false,
      });

      // Mock webhook verification to return user.updated event
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.updated',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should update existing user data in MongoDB', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.updated', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');

      // Verify user was actually updated in MongoDB
      const updatedUser = await User.findByClerkId('clerk_user_123');
      expect(updatedUser?.email).toBe('test@example.com'); // Updated
      expect(updatedUser?.firstName).toBe('John'); // Updated
      expect(updatedUser?.lastName).toBe('Doe'); // Updated
      expect(updatedUser?.isEmailVerified).toBe(true); // Updated
      expect(updatedUser?.syncStatus).toBe('active');
      expect(updatedUser?.lastClerkSync).toBeDefined();
    });
  });

  describe('User Deleted Event - Real Database', () => {
    let _existingUser: any;

    beforeEach(async () => {
      // Create existing user first
      _existingUser = await User.createClerkUser({
        clerkId: 'clerk_user_123',
        email: 'todelete@example.com',
        emailVerified: true,
      });

      // Mock webhook verification to return user.deleted event
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.deleted',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should mark user as deleted in MongoDB', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.deleted', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');

      // Verify user status was updated (soft delete)
      const deletedUser = await User.findByClerkId('clerk_user_123');
      expect(deletedUser?.syncStatus).toBe('error'); // Marked as error status
      expect(deletedUser?.lastClerkSync).toBeDefined();
    });

    it('should handle deletion of non-existent user gracefully', async () => {
      const nonExistentUserData = {
        ...mockClerkUserData,
        id: 'non_existent_user',
      };

      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.deleted',
          data: nonExistentUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.deleted', data: nonExistentUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
    });
  });

  describe('Error Scenarios - Real Database', () => {
    it('should handle webhook with missing primary email address', async () => {
      const userDataWithoutEmail = {
        ...mockClerkUserData,
        email_addresses: [], // No email addresses
      };

      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: userDataWithoutEmail,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: userDataWithoutEmail }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');

      // Verify no user was created
      const user = await User.findByClerkId('clerk_user_123');
      expect(user).toBeNull();
    });

    it('should prevent duplicate Clerk ID creation', async () => {
      // Create first user
      await User.createClerkUser({
        clerkId: 'clerk_user_123',
        email: 'first@example.com',
        emailVerified: true,
      });

      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');

      // Verify only one user exists
      const users = await User.find({ clerkId: 'clerk_user_123' });
      expect(users).toHaveLength(1);
    });
  });
});