/**
 * Shared test utilities to eliminate duplication
 */

import { MongoClient } from 'mongodb';

/**
 * Create test MongoDB client
 */
export function createTestClient() {
  return {} as MongoClient;
}

/**
 * Mock session data for testing
 */
export function createMockSession() {
  return {
    userId: 'test-user-id',
    sessionToken: 'test-session-token',
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
}

/**
 * Basic session data structure
 */
export function createTestSessionData() {
  return {
    sessionToken: 'test-token',
    userId: 'test-user-id',
    expires: new Date(),
  };
}

/**
 * Validate session data structure
 */
export function validateSessionData(sessionData: any) {
  expect(sessionData).toHaveProperty('sessionToken');
  expect(sessionData).toHaveProperty('userId');
  expect(sessionData).toHaveProperty('expires');
}