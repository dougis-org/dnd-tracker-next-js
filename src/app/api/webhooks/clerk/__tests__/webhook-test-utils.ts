/**
 * Shared webhook test utilities and mock data
 */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

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
  primary_email_address_id: 'email_456',
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

  // Set environment variables for connectToDatabase function
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_DB_NAME = 'test';

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

  // Clean up environment variables
  delete process.env.MONGODB_URI;
  delete process.env.MONGODB_DB_NAME;
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

  // Setup default headers mock with valid webhook headers
  setupMockHeaders();
}

/**
 * Setup headers mock with valid webhook headers (Next.js 15.5.2 async behavior)
 */
export function setupMockHeaders(customHeaders?: Record<string, string | null>) {
  const mockHeadersFunction = require('next/headers').headers;
  const headersToUse = customHeaders || mockHeaders;

  mockHeadersFunction.mockResolvedValue({
    get: jest.fn((key: string) => headersToUse[key as keyof typeof headersToUse]),
  });
}

/**
 * Setup headers mock that returns null for all headers (for missing headers tests)
 */
export function setupMockHeadersWithNullValues() {
  const mockHeadersFunction = require('next/headers').headers;
  mockHeadersFunction.mockResolvedValue({
    get: jest.fn(() => null),
  });
}

/**
 * Setup headers mock that throws an error (for error handling tests)
 */
export function setupMockHeadersWithError(error: Error = new Error('Unexpected error')) {
  const mockHeadersFunction = require('next/headers').headers;
  mockHeadersFunction.mockImplementation(() => {
    throw error;
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

  // Reset the global mock and set it to our specific mock
  const MockedWebhook = require('svix').Webhook;
  MockedWebhook.mockClear();
  MockedWebhook.mockImplementation(() => mockWebhook);
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
}