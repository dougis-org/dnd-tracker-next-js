/**
 * Simplified Session Configuration Tests (Issue #524)
 */

import {
  testJWTDefault,
  testDatabaseStrategy,
  testInvalidFallback,
} from './test-helpers/session-test-patterns';

describe('Session Configuration System (Issue #524)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Session Strategy Detection', () => {
    test('should default to JWT strategy', () => {
      testJWTDefault();
    });

    test('should use database strategy when configured', () => {
      testDatabaseStrategy();
    });

    test('should fallback to JWT for invalid values', () => {
      testInvalidFallback();
    });
  });
});