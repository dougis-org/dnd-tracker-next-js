import { NextRequest } from 'next/server';
// Lightweight MVP test version: use in-memory mocks instead of real MongoDB.
// We mock the User model with an in-memory store to validate handler logic.
// POST handler reference (req param intentionally unused in type signature -> underscore to satisfy lint)
let POST: (_req: NextRequest) => Promise<Response>;
let User: any; // mocked User module
let Webhook: any;
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
} from './webhook-test-utils';

// We still mock next/headers to control header values deterministically
jest.mock('next/headers', () => ({ headers: jest.fn() }));

// We'll stub the svix Webhook.verify method (default success; per-test overrides provided via mockImplementationOnce)
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

// Mock the User model with an in-memory store to avoid real mongoose/mongodb usage
jest.mock('@/lib/models/User', () => {
  const store = new Map();
  const buildUser = data => ({
    ...data,
    _id: `mock-${data.clerkId}`,
    syncStatus: 'ok',
    lastClerkSync: new Date(),
    save: async function () {
      return this;
    },
  });
  const api = {
    createClerkUser: jest.fn(async data => {
      if ([...store.values()].some(u => u.clerkId === data.clerkId)) {
        throw new Error('duplicate');
      }
      const user = buildUser(data);
      store.set(data.clerkId, user);
      return user;
    }),
    updateFromClerkData: jest.fn(async (clerkId, data) => {
      const existing = store.get(clerkId);
      if (!existing) throw new Error('not found');
      Object.assign(existing, data, { lastClerkSync: new Date() });
      return existing;
    }),
    findByClerkId: jest.fn(async id => store.get(id) || null),
    findOne: jest.fn(async query => {
      if (query?.clerkId) return store.get(query.clerkId) || null;
      if (query?.email)
        return [...store.values()].find(u => u.email === query.email) || null;
      return null;
    }),
    __store: store,
  };
  return { __esModule: true, default: api };
});

// Setup test environment
setupWebhookTestEnvironment();

// Helper function to reduce webhook mock duplication
function mockWebhookVerify(eventType: string, data: any) {
  (Webhook as unknown as jest.Mock).mockImplementationOnce(() => ({
    verify: jest.fn().mockReturnValue({ type: eventType, data }),
  }));
}

describe('/api/webhooks/clerk (mvp mocked model)', () => {
  beforeAll(async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'test_secret';
    applySvixMock();
    ({ POST } = await import('../route'));
    // Import mocked module without full type declarations for MVP scope
    User = ((await import('@/lib/models/User')) as any).default;
    Webhook = (await import('svix')).Webhook;
  });

  afterAll(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupWebhookMocks();
    if (User?.__store) User.__store.clear();
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

  // Database connection failure test omitted in MVP mocked setup (handled by connectToDatabase mock)

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
      mockWebhookVerify('user.created', mockClerkUserData);
      await POST(createWebhookRequest('user.created', mockClerkUserData));
      // Second attempt causes duplicate error inside model create
      mockWebhookVerify('user.created', mockClerkUserData);
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
