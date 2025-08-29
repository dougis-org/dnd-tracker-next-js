/**
 * Shared utilities for User model tests
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ClerkUserData } from '../User';

// Common test timeout
export const TEST_TIMEOUT = 30000;

// Common Clerk user data for testing
export const sampleClerkUserData: ClerkUserData = {
  clerkId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  imageUrl: 'https://example.com/avatar.jpg',
  emailVerified: true,
};

// Variant test data
export const sampleClerkUserDataWithoutUsername: ClerkUserData = {
  clerkId: 'clerk_456',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  emailVerified: false,
};

export const sampleClerkUserDataMinimal: ClerkUserData = {
  clerkId: 'clerk_prefs',
  email: 'prefs@example.com',
  emailVerified: true,
};

// Additional test data for specific scenarios
export const sampleClerkUserDataForUpdate: ClerkUserData = {
  clerkId: 'clerk_update',
  email: 'original@example.com',
  firstName: 'Original',
  lastName: 'User',
  username: 'originaluser',
  emailVerified: false,
};

export const sampleClerkUserDataUpdated: ClerkUserData = {
  clerkId: 'clerk_update',
  email: 'updated@example.com',
  firstName: 'Updated',
  lastName: 'User',
  username: 'updateduser',
  imageUrl: 'https://example.com/new-avatar.jpg',
  emailVerified: true,
};

export const sampleClerkUserDataPartial: ClerkUserData = {
  clerkId: 'clerk_update',
  email: 'newemail@example.com',
  emailVerified: true,
};

/**
 * Setup MongoDB memory server for User model testing
 */
export async function setupUserTestDatabase(): Promise<MongoMemoryServer> {
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
 * Cleanup MongoDB memory server for User model testing
 */
export async function cleanupUserTestDatabase(mongoServer: MongoMemoryServer) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all MongoDB collections for User model testing
 */
export async function clearUserTestCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Common assertions for created Clerk users
 */
export function expectValidClerkUser(user: any, expectedData: ClerkUserData) {
  expect(user.clerkId).toBe(expectedData.clerkId);
  expect(user.email).toBe(expectedData.email);
  expect(user.firstName).toBe(expectedData.firstName || '');
  expect(user.lastName).toBe(expectedData.lastName || '');
  expect(user.username).toBe(expectedData.username || expectedData.email.split('@')[0]);
  expect(user.imageUrl).toBe(expectedData.imageUrl);
  expect(user.isEmailVerified).toBe(expectedData.emailVerified);
  expect(user.authProvider).toBe('clerk');
  expect(user.syncStatus).toBe('active');
  expect(user.role).toBe('user');
  expect(user.subscriptionTier).toBe('free');
  expect(user.lastClerkSync).toBeDefined();
}

/**
 * Common assertions for default user preferences
 */
export function expectDefaultPreferences(user: any) {
  expect(user.preferences.theme).toBe('system');
  expect(user.preferences.emailNotifications).toBe(true);
  expect(user.preferences.browserNotifications).toBe(false);
  expect(user.preferences.timezone).toBe('UTC');
  expect(user.preferences.language).toBe('en');
  expect(user.preferences.diceRollAnimations).toBe(true);
  expect(user.preferences.autoSaveEncounters).toBe(true);
}

/**
 * Setup common test environment for User model tests
 */
export function setupUserTestEnvironment() {
  jest.setTimeout(TEST_TIMEOUT);
}