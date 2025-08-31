/**
 * Simplified persistence test patterns
 */

import {
  createTestClient,
  createTestSessionData,
  validateSessionData,
} from './shared-test-utilities';

/**
 * Test utilities for persistence operations
 */
export const testAdapterCreation = () => {
  const client = createTestClient();
  expect(client).toBeDefined();
};

export const testSessionStructure = () => validateSessionData(createTestSessionData());