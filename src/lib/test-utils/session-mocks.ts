/**
 * Session test utilities for Issue #527
 * Provides mock data and helper functions for testing session storage and retrieval
 */

import { ObjectId } from 'mongodb';

/**
 * Creates a mock user for session testing
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: new ObjectId().toString(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    subscriptionTier: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock session for testing
 */
export function createMockSession(overrides: Partial<any> = {}) {
  return {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      subscriptionTier: 'free',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    ...overrides,
  };
}

/**
 * Creates a mock expired session
 */
export function createExpiredSession() {
  return {
    user: { id: 'user123', email: 'test@example.com' },
    expires: new Date(Date.now() - 1000).toISOString(),
  };
}

/**
 * Session test constants
 */
export const SessionTestConstants = {
  VALID_USER_ID: 'user123',
  VALID_EMAIL: 'test@example.com',
  VALID_SUBSCRIPTION_TIER: 'expert',
  EXPIRED_SESSION_TIME: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  VALID_SESSION_TIME: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  UPDATE_AGE: 24 * 60 * 60, // 24 hours in seconds
} as const;

/**
 * Mock auth function factory for testing
 */
export function createMockAuth(sessionData: any = null) {
  return jest.fn().mockResolvedValue(sessionData);
}

/**
 * Mock auth that throws errors
 */
export function createErrorAuth(error: Error = new Error('Auth error')) {
  return jest.fn().mockRejectedValue(error);
}