/**
 * Shared test utilities to eliminate duplication
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';

/**
 * Create test adapter instance
 */
export function createTestAdapter() {
  return MongoDBAdapter(Promise.resolve({} as MongoClient));
}

/**
 * Basic adapter validation
 */
export function validateAdapter(adapter: any) {
  expect(adapter).toBeDefined();
  expect(adapter.createSession).toBeDefined();
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