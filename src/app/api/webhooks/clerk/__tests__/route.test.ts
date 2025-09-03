import { POST } from '../route';
import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';
import {
  setupWebhookTestEnvironment,
  setupWebhookMocks,
  cleanupWebhookMocks,
  createMockWebhook,
  createWebhookRequest,
  expectSuccessfulWebhookResponse,
  expectFailedWebhookResponse,
  setupMockHeadersWithNullValues,
  setupMockHeadersWithError,
  mockClerkUserData,
} from './webhook-test-utils';

// Mock dependencies
jest.mock('@/lib/models/User', () => ({
  createClerkUser: jest.fn(),
  updateFromClerkData: jest.fn(),
  findByClerkId: jest.fn(),
  save: jest.fn(),
}));
jest.mock('@/lib/db');
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Setup test environment
setupWebhookTestEnvironment();

describe('/api/webhooks/clerk', () => {
  const mockUser = {
    _id: 'user123',
    clerkId: 'clerk_user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupWebhookMocks();

    // Mock database connection
    (connectToDatabase as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupWebhookMocks();
  });

  describe('Webhook Signature Verification', () => {
    it('should reject requests with missing headers', async () => {
      setupMockHeadersWithNullValues();

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
      createMockWebhook('user.created', mockClerkUserData);
    });

    it('should create a new user successfully', async () => {
      (User.createClerkUser as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);
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

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectFailedWebhookResponse(response, data, 500, 'Failed to process webhook');
    });
  });

  describe('user.updated Event', () => {
    beforeEach(() => {
      createMockWebhook('user.updated', mockClerkUserData);
    });

    it('should update an existing user successfully', async () => {
      (User.updateFromClerkData as jest.Mock).mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.updated', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);
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

      const request = createWebhookRequest('user.updated', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectFailedWebhookResponse(response, data, 500, 'Failed to process webhook');
    });
  });

  describe('user.deleted Event', () => {
    beforeEach(() => {
      createMockWebhook('user.deleted', mockClerkUserData);
    });

    it('should handle user deletion successfully', async () => {
      (User.findByClerkId as jest.Mock).mockResolvedValue(mockUser);
      mockUser.save.mockResolvedValue(mockUser);

      const request = createWebhookRequest('user.deleted', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);
      expect(User.findByClerkId).toHaveBeenCalledWith('clerk_user_123');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent user', async () => {
      (User.findByClerkId as jest.Mock).mockResolvedValue(null);

      const request = createWebhookRequest('user.deleted', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);
      expect(User.findByClerkId).toHaveBeenCalledWith('clerk_user_123');
    });
  });

  describe('Unhandled Events', () => {
    it('should handle unrecognized event types gracefully', async () => {
      createMockWebhook('user.unknown_event', mockClerkUserData);
      const request = createWebhookRequest('user.unknown_event', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Event type not handled');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock headers to throw an unexpected error
      setupMockHeadersWithError(new Error('Unexpected error'));

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