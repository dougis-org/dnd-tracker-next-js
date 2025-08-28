import { NextRequest } from 'next/server';
import { POST } from '../route';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';
import { Webhook } from 'svix';

// Mock dependencies
jest.mock('@/lib/models/User');
jest.mock('@/lib/db');
jest.mock('svix');
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

describe('/api/webhooks/clerk', () => {
  const mockUser = {
    _id: 'user123',
    clerkId: 'clerk_user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    save: jest.fn(),
  };

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

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variable
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';

    // Mock headers
    const mockHeadersFunction = require('next/headers').headers;
    mockHeadersFunction.mockReturnValue({
      get: jest.fn((key: string) => mockHeaders[key as keyof typeof mockHeaders]),
    });

    // Mock database connection
    (connectToDatabase as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  describe('Webhook Signature Verification', () => {
    it('should reject requests with missing headers', async () => {
      const mockHeadersFunction = require('next/headers').headers;
      mockHeadersFunction.mockReturnValue({
        get: jest.fn(() => null),
      });

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required webhook headers');
    });

    it('should reject requests with missing webhook secret', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
    });

    it('should reject requests with invalid signature', async () => {
      const mockWebhook = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Invalid signature');
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid webhook signature');
    });
  });

  describe('Database Connection', () => {
    it('should handle database connection failures', async () => {
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
      (connectToDatabase as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('user.created Event', () => {
    beforeEach(() => {
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should create a new user successfully', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

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

    it('should handle missing primary email address', async () => {
      const userDataWithoutEmail = {
        ...mockClerkUserData,
        email_addresses: [],
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
    });

    it('should handle user creation errors', async () => {
      (User.createClerkUser as jest.Mock).mockRejectedValue(new Error('User creation failed'));

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });
  });

  describe('user.updated Event', () => {
    beforeEach(() => {
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.updated',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should update an existing user successfully', async () => {
      (User.updateFromClerkData as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.updated', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
      expect(User.updateFromClerkData).toHaveBeenCalledWith('clerk_user_123', {
        clerkId: 'clerk_user_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        imageUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });
    });

    it('should handle user update errors', async () => {
      (User.updateFromClerkData as jest.Mock).mockRejectedValue(new Error('User update failed'));

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.updated', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });
  });

  describe('user.deleted Event', () => {
    beforeEach(() => {
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.deleted',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
    });

    it('should handle user deletion successfully', async () => {
      (User.findByClerkId as jest.Mock).mockResolvedValue(mockUser);
      mockUser.save.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.deleted', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
      expect(User.findByClerkId).toHaveBeenCalledWith('clerk_user_123');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent user', async () => {
      (User.findByClerkId as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.deleted', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
      expect(User.findByClerkId).toHaveBeenCalledWith('clerk_user_123');
    });
  });

  describe('Unhandled Events', () => {
    it('should handle unrecognized event types gracefully', async () => {
      const mockWebhook = {
        verify: jest.fn().mockReturnValue({
          type: 'user.unknown_event',
          data: mockClerkUserData,
        }),
      };
      (Webhook as jest.Mock).mockImplementation(() => mockWebhook);

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.unknown_event', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Event type not handled');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock headers to throw an unexpected error
      const mockHeadersFunction = require('next/headers').headers;
      mockHeadersFunction.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});