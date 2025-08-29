/**
 * Shared webhook test utilities and mock data
 */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Webhook } from 'svix';

// Common test timeout
export const TEST_TIMEOUT = 30000;

// Mock webhook headers
export const mockHeaders = {
  'svix-id': 'msg_test_id',
  'svix-timestamp': '1234567890',
  'svix-signature': 'v1,signature',
};

// Mock Clerk user data
export const mockClerkUserData = {
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

// Variant data for testing different scenarios
export const mockClerkUserDataWithoutUsername = {
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

export const mockClerkUserDataWithoutEmail = {
  ...mockClerkUserData,
  email_addresses: [], // No email addresses
};

/**
 * Setup MongoDB memory server for testing
 */
export async function setupMongoMemoryServer(): Promise<MongoMemoryServer> {
  // Disconnect any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  return mongoServer;
}

/**
 * Cleanup MongoDB memory server
 */
export async function cleanupMongoMemoryServer(mongoServer: MongoMemoryServer) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all MongoDB collections
 */
export async function clearMongoCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Setup mock dependencies for webhook tests
 */
export function setupWebhookMocks() {
  // Mock environment variable
  process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';

  // Mock headers function
  const mockHeadersFunction = require('next/headers').headers;
  mockHeadersFunction.mockResolvedValue({
    get: jest.fn((key: string) => mockHeaders[key as keyof typeof mockHeaders]),
  });
}

/**
 * Cleanup mock environment variables
 */
export function cleanupWebhookMocks() {
  delete process.env.CLERK_WEBHOOK_SECRET;
}

/**
 * Create a mock webhook for specific event type
 */
export function createMockWebhook(eventType: string, userData: any = mockClerkUserData) {
  const mockWebhook = {
    verify: jest.fn().mockReturnValue({
      type: eventType,
      data: userData,
    }),
  };
  (Webhook as jest.Mock).mockImplementation(() => mockWebhook);
  return mockWebhook;
}

/**
 * Create a NextRequest for webhook testing
 */
export function createWebhookRequest(eventType: string, userData: any = mockClerkUserData): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    body: JSON.stringify({ type: eventType, data: userData }),
  });
}

/**
 * Common test assertions for successful webhook responses
 */
export function expectSuccessfulWebhookResponse(response: Response, data: any) {
  expect(response.status).toBe(200);
  expect(data.message).toBe('Webhook processed successfully');
}

/**
 * Common test assertions for failed webhook responses
 */
export function expectFailedWebhookResponse(response: Response, data: any, expectedStatus: number, expectedError?: string) {
  expect(response.status).toBe(expectedStatus);
  if (expectedError) {
    expect(data.error).toBe(expectedError);
  }
}

/**
 * Setup common test environment for both unit and integration tests
 */
export function setupWebhookTestEnvironment() {
  jest.setTimeout(TEST_TIMEOUT);

  // Mock dependencies that don't need real implementations
  jest.mock('svix');
  jest.mock('next/headers', () => ({
    headers: jest.fn(),
  }));
  jest.mock('@/lib/db', () => ({
    connectToDatabase: jest.fn().mockResolvedValue(undefined),
  }));
}