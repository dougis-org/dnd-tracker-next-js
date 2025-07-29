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
 * Basic adapter creation test
 */
export function testAdapterCreation() {
  const adapter = createTestAdapter();
  validateAdapter(adapter);
}

/**
 * Basic session structure test
 */
export function testSessionStructure() {
  const sessionData = createTestSessionData();
  validateSessionData(sessionData);
}