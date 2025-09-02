/**
 * Shared Test Constants
 *
 * Centralized constants used across all test files to ensure consistency.
 */

const TEST_USER_ID = 'test-user-123';

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID,
  TEST_EMAIL: 'test@example.com',
  DEFAULT_USER_ID: TEST_USER_ID,
  TEST_SUBSCRIPTION_TIER: 'free' as const,
  TEST_USER_NAME: 'Test User',
} as const;