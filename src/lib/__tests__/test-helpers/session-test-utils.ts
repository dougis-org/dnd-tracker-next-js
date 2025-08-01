/**
 * Test utilities for session testing (Issue #524)
 *
 * Common test setup and utilities to reduce duplication across session tests
 */

import mongoose from 'mongoose';

/**
 * Create a mock MongoDB collection with standard methods
 */
export function createMockCollection() {
  return {
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    createIndex: jest.fn().mockResolvedValue('index_created'),
  };
}

/**
 * Create a mock MongoDB database with collections
 */
export function createMockDatabase(collections: { [key: string]: any }) {
  return {
    collection: jest.fn().mockImplementation((name: string) => {
      return collections[name] || createMockCollection();
    }),
  };
}

/**
 * Create a mock MongoDB client
 */
export function createMockClient(mockDb: any) {
  return {
    db: jest.fn().mockReturnValue(mockDb),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  } as any;
}

/**
 * Standard session data generator
 */
export function createSessionData(overrides: Partial<any> = {}) {
  return {
    sessionToken: 'test-session-token-123',
    userId: new mongoose.Types.ObjectId().toString(),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    ...overrides,
  };
}

/**
 * Standard user data generator
 */
export function createUserData(overrides: Partial<any> = {}) {
  return {
    _id: new mongoose.Types.ObjectId().toString(),
    email: 'test@example.com',
    name: 'Test User',
    subscriptionTier: 'premium',
    ...overrides,
  };
}

/**
 * Standard mock responses for successful operations
 */
export const mockResponses = {
  insert: {
    insertedId: () => new mongoose.Types.ObjectId(),
    acknowledged: true,
  },
  update: {
    matchedCount: 1,
    modifiedCount: 1,
    acknowledged: true,
  },
  delete: {
    deletedCount: 1,
    acknowledged: true,
  },
};

/**
 * Setup standard mocks for MongoDB operations
 */
export function setupStandardMocks(mockCollection: any) {
  mockCollection.insertOne.mockResolvedValue(mockResponses.insert);
  mockCollection.updateOne.mockResolvedValue(mockResponses.update);
  mockCollection.deleteOne.mockResolvedValue(mockResponses.delete);
}

/**
 * Clear all mocks - common cleanup utility
 */
export function clearAllMocks() {
  jest.clearAllMocks();
}

/**
 * Reset mongoose models - common test cleanup
 */
export function resetMongooseModels() {
  mongoose.models = {};
}