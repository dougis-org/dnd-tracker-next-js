/**
 * Session Storage and Retrieval Tests (Issue #527)
 *
 * Comprehensive tests for ensuring session storage and retrieval works correctly
 * with both JWT and database session strategies.
 * 
 * This file has been refactored to use modular test utilities to reduce complexity
 * and eliminate duplication with other test files.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  setupTestEnvironment, 
  resetTestEnvironment, 
  cleanupTestEnvironment 
} from '../test-utils/session-test-helpers';
import { 
  testSessionStrategyDetection,
  testSessionUtilities,
  testEnhancedSessionManagement,
  testIntegrationTests 
} from './session-tests';

beforeAll(async () => {
  await setupTestEnvironment();
});

afterAll(async () => {
  await cleanupTestEnvironment();
});

// Run all modular test suites
describe('Session Storage and Retrieval (Issue #527)', () => {
  // Run each modular test suite
  testSessionStrategyDetection();
  testSessionUtilities();
  testEnhancedSessionManagement();
  testIntegrationTests();

  // Additional integration tests for Issue #527
  describe('Integration Tests for Issue #527', () => {
    beforeEach(() => {
      resetTestEnvironment();
    });

    it('should handle both JWT and database strategies consistently', async () => {
      const { SESSION_STRATEGY } = require('../session-config');
      expect(['jwt', 'database']).toContain(SESSION_STRATEGY);
    });
  });
});