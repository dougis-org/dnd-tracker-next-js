/**
 * Simplified persistence test patterns
 */

import {
  createTestAdapter,
  validateAdapter,
  createTestSessionData,
  validateSessionData,
} from './shared-test-utilities';

/**
 * Test utilities for persistence operations
 */
export const testAdapterCreation = () => validateAdapter(createTestAdapter());
export const testSessionStructure = () => validateSessionData(createTestSessionData());