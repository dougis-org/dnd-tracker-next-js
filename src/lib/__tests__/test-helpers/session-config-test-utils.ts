/**
 * Test utilities for session configuration testing
 * Reduces complexity in session-config.test.ts
 */

import { SESSION_TIMEOUTS } from '@/lib/constants/session-constants';

/**
 * Create mock session data
 */
export function createMockSession(overrides: Partial<any> = {}) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      subscriptionTier: 'premium',
      ...overrides,
    },
  };
}

/**
 * Setup mocks for auth modules
 */
export function setupAuthMocks(mockAuth: jest.Mock) {
  jest.doMock('@/lib/auth', () => ({
    handlers: {},
    auth: mockAuth,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));

  jest.doMock('@/lib/auth-database-session', () => ({
    handlers: {},
    auth: mockAuth,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));
}

/**
 * Create console spy for testing logging
 */
export function setupConsoleSpy() {
  return jest.spyOn(console, 'log').mockImplementation();
}

/**
 * Test session utility method with success case
 */
export async function testSessionUtilitySuccess<T>(
  mockAuth: jest.Mock,
  mockSession: any,
  utilityMethod: () => Promise<T>,
  expectedResult: T
) {
  mockAuth.mockResolvedValue(mockSession);
  const result = await utilityMethod();
  expect(result).toEqual(expectedResult);
}

/**
 * Test session utility method with error case
 */
export async function testSessionUtilityError<T>(
  mockAuth: jest.Mock,
  utilityMethod: () => Promise<T>,
  expectedResult: T
) {
  mockAuth.mockRejectedValue(new Error('Auth error'));
  const result = await utilityMethod();
  expect(result).toEqual(expectedResult);
}

/**
 * Test session configuration properties
 */
export function validateSessionConfig(config: any, strategy: string) {
  expect(config.strategy).toBe(strategy);
  expect(config.maxAge).toBe(SESSION_TIMEOUTS.MAX_AGE);
  expect(config.updateAge).toBe(SESSION_TIMEOUTS.UPDATE_AGE);
}

/**
 * Test UUID format validation
 */
export function validateUUIDFormat(token: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(token).toMatch(uuidRegex);
}