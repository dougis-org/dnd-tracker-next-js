import { NextRequest } from 'next/server';
// NOTE: We intentionally do NOT import route handler or User model at top level.
// Global jest.setup.js mocks mongoose & db. For live-model tests we reset modules
// and unmock those dependencies, then dynamically import real implementations.
let POST: (req: NextRequest) => Promise<Response>;
let User: any;
let Webhook: any;
let connectToDatabase: () => Promise<void>;
let disconnectFromDatabase: () => Promise<void>;
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  setupWebhookTestEnvironment,
  setupWebhookMocks,
  cleanupWebhookMocks,
  createWebhookRequest,
  expectSuccessfulWebhookResponse,
  expectFailedWebhookResponse,
  setupMockHeadersWithNullValues,
  setupMockHeadersWithError,
  mockClerkUserData,
  clearMongoCollections,
} from './webhook-test-utils';

// We still mock next/headers to control header values deterministically
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// We'll stub only the svix Webhook.verify method per test case instead of the whole model/db layer
function applySvixMock() {
  jest.mock('svix', () => {
    const actual = jest.requireActual('svix');
    return {
      ...actual,
      Webhook: jest.fn().mockImplementation(() => ({
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: mockClerkUserData,
        }),
      })),
    };
  });
}

// Setup test environment
setupWebhookTestEnvironment();

describe('/api/webhooks/clerk (live model)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.MONGODB_DB_NAME = 'test';

    // Reset module registry & remove global mocks for live integration
    jest.resetModules();
    jest.unmock('mongoose');
    jest.unmock('@/lib/db');
    jest.unmock('./src/lib/db'); // defensive (path used in jest.setup mock)

    // Re-apply required mocks
    applySvixMock();
    jest.mock('next/headers', () => ({ headers: jest.fn() }));

    // Dynamically import real modules AFTER unmocking
    ({ POST } = await import('../route'));
    User = (await import('@/lib/models/User')).default;
    ({ connectToDatabase, disconnectFromDatabase } = await import('@/lib/db'));
    Webhook = (await import('svix')).Webhook;

    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
    if (mongoServer) await mongoServer.stop();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_DB_NAME;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    setupWebhookMocks();
    // Clean collections between tests (guard for not-yet-initialized connection)
    if (mongoose.connection.readyState === 1) {
      await clearMongoCollections();
    }
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
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest.fn(() => {
          throw new Error('Invalid signature');
        }),
      }));

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
      // Temporarily disconnect and unset env to force connection error
      const originalUri = process.env.MONGODB_URI;
      // Fully disconnect so connectToDatabase will attempt a fresh connection
      await disconnectFromDatabase();
      delete process.env.MONGODB_URI;
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: mockClerkUserData }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');

      // Restore env
      process.env.MONGODB_URI = originalUri;
      await connectToDatabase(); // re-establish for subsequent tests
    });
  });

  describe('user.created Event', () => {
    it('should create a new user successfully', async () => {
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));

      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();
      expectSuccessfulWebhookResponse(response, data);

      const created = await User.findOne({ clerkId: 'clerk_user_123' });
      expect(created).toBeTruthy();
      expect(created?.email).toBe('test@example.com');
      expect(created?.username).toBe('johndoe');
    });

    it('should handle missing primary email address', async () => {
      const userDataWithoutEmail = {
        ...mockClerkUserData,
        email_addresses: [],
      };

      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest.fn().mockReturnValue({
          type: 'user.created',
          data: userDataWithoutEmail,
        }),
      }));

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: userDataWithoutEmail,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
    });

    it('should handle user creation errors', async () => {
      // Force duplicate creation to trigger user exists error
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));
      await POST(createWebhookRequest('user.created', mockClerkUserData));
      // Second attempt causes duplicate error inside model create
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));
      const response = await POST(
        createWebhookRequest('user.created', mockClerkUserData)
      );
      const data = await response.json();
      expectFailedWebhookResponse(
        response,
        data,
        500,
        'Failed to process webhook'
      );
    });
  });

  describe('user.updated Event', () => {
    it('should update an existing user successfully', async () => {
      // First create user
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));
      await POST(createWebhookRequest('user.created', mockClerkUserData));

      // Now update with modified data
      const updatedData = { ...mockClerkUserData, first_name: 'Johnny' };
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.updated', data: updatedData }),
      }));
      const response = await POST(
        createWebhookRequest('user.updated', updatedData)
      );
      const data = await response.json();
      expectSuccessfulWebhookResponse(response, data);

      const updated = await User.findOne({ clerkId: 'clerk_user_123' });
      expect(updated?.firstName).toBe('Johnny');
    });

    it('should handle user update errors', async () => {
      // Attempt update on non-existent user
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.updated', data: mockClerkUserData }),
      }));
      const response = await POST(
        createWebhookRequest('user.updated', mockClerkUserData)
      );
      const data = await response.json();
      expectFailedWebhookResponse(
        response,
        data,
        500,
        'Failed to process webhook'
      );
    });
  });

  describe('user.deleted Event', () => {
    it('should handle user deletion successfully', async () => {
      // Create then delete
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.created', data: mockClerkUserData }),
      }));
      await POST(createWebhookRequest('user.created', mockClerkUserData));
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.deleted', data: mockClerkUserData }),
      }));
      const response = await POST(
        createWebhookRequest('user.deleted', mockClerkUserData)
      );
      const data = await response.json();
      expectSuccessfulWebhookResponse(response, data);
      const deleted = await User.findOne({ clerkId: 'clerk_user_123' });
      expect(deleted?.syncStatus).toBe('error');
    });

    it('should handle deletion of non-existent user', async () => {
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest
          .fn()
          .mockReturnValue({ type: 'user.deleted', data: mockClerkUserData }),
      }));
      const response = await POST(
        createWebhookRequest('user.deleted', mockClerkUserData)
      );
      const data = await response.json();
      expectSuccessfulWebhookResponse(response, data);
    });
  });

  describe('Unhandled Events', () => {
    it('should handle unrecognized event types gracefully', async () => {
      (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
        verify: jest.fn().mockReturnValue({
          type: 'user.unknown_event',
          data: mockClerkUserData,
        }),
      }));
      const request = createWebhookRequest(
        'user.unknown_event',
        mockClerkUserData
      );
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
