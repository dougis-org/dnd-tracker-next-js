import { MongoMemoryServer } from 'mongodb-memory-server';
import { POST } from '../route';
import User from '@/lib/models/User';
import {
  setupWebhookTestEnvironment,
  setupMongoMemoryServer,
  cleanupMongoMemoryServer,
  clearMongoCollections,
  setupWebhookMocks,
  cleanupWebhookMocks,
  createMockWebhook,
  createWebhookRequest,
  expectSuccessfulWebhookResponse,
  expectFailedWebhookResponse,
  mockClerkUserData,
  mockClerkUserDataWithoutUsername,
  mockClerkUserDataWithoutEmail,
} from './webhook-test-utils';

// Setup test environment
setupWebhookTestEnvironment();

describe('/api/webhooks/clerk - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await setupMongoMemoryServer();
  });

  afterAll(async () => {
    await cleanupMongoMemoryServer(mongoServer);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearMongoCollections();
    setupWebhookMocks();
  });

  afterEach(() => {
    cleanupWebhookMocks();
  });

  describe('User Created Event - Real Database', () => {
    beforeEach(() => {
      createMockWebhook('user.created', mockClerkUserData);
    });

    it('should create a new user in MongoDB when webhook is received', async () => {
      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);

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
      createMockWebhook('user.created', mockClerkUserDataWithoutUsername);
      const request = createWebhookRequest('user.created', mockClerkUserDataWithoutUsername);

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

      const request = createWebhookRequest('user.created', mockClerkUserData);
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

      createMockWebhook('user.updated', mockClerkUserData);
    });

    it('should update existing user data in MongoDB', async () => {
      const request = createWebhookRequest('user.updated', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);

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

      createMockWebhook('user.deleted', mockClerkUserData);
    });

    it('should mark user as deleted in MongoDB', async () => {
      const request = createWebhookRequest('user.deleted', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);

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

      createMockWebhook('user.deleted', nonExistentUserData);
      const request = createWebhookRequest('user.deleted', nonExistentUserData);
      const response = await POST(request);
      const data = await response.json();

      expectSuccessfulWebhookResponse(response, data);
    });
  });

  describe('Error Scenarios - Real Database', () => {
    it('should handle webhook with missing primary email address', async () => {
      createMockWebhook('user.created', mockClerkUserDataWithoutEmail);
      const request = createWebhookRequest('user.created', mockClerkUserDataWithoutEmail);
      const response = await POST(request);
      const data = await response.json();

      expectFailedWebhookResponse(response, data, 500, 'Failed to process webhook');

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

      createMockWebhook('user.created', mockClerkUserData);
      const request = createWebhookRequest('user.created', mockClerkUserData);
      const response = await POST(request);
      const data = await response.json();

      expectFailedWebhookResponse(response, data, 500, 'Failed to process webhook');

      // Verify only one user exists
      const users = await User.find({ clerkId: 'clerk_user_123' });
      expect(users).toHaveLength(1);
    });
  });
});