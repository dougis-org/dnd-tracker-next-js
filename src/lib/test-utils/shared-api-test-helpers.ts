import { NextRequest } from 'next/server';

/**
 * Shared API Test Helpers
 *
 * Simplified utilities for API route testing.
 */

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: '507f1f77bcf86cd799439011',
  TEST_EMAIL: 'test@example.com',
  TEST_SUBSCRIPTION_TIER: 'free' as const,
  TEST_USER_NAME: 'John Doe',
} as const;

export const createMockSession = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => ({
  user: {
    id: userId,
    email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
    name: SHARED_API_TEST_CONSTANTS.TEST_USER_NAME,
    subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
  },
  expires: '2024-12-31T23:59:59.999Z',
});

export const createMockJwtToken = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => ({
  sub: userId,
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
  firstName: 'John',
  lastName: 'Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  jti: 'test-jwt-id',
});

export const createMockRequest = (data: any, method = 'PATCH') => ({
  json: jest.fn().mockResolvedValue(data),
  method,
  headers: new Headers({ 'content-type': 'application/json' }),
}) as unknown as NextRequest;

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  timezone: 'America/New_York',
  dndEdition: 'Pathfinder 2e',
  experienceLevel: 'experienced' as const,
  primaryRole: 'dm' as const,
  subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
  ...overrides,
});

export const createMockCredentials = (overrides: Partial<any> = {}) => ({
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  password: 'test-password-123',
  rememberMe: false,
  ...overrides,
});

export const expectSuccessResponse = async (response: Response, expectedData: any) => {
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data).toEqual({ success: true, ...expectedData });
};

export const expectErrorResponse = async (response: Response, status: number, message: string) => {
  const data = await response.json();
  expect(response.status).toBe(status);
  expect(data.success).toBe(false);
  expect(data.error || data.message).toBe(message);
};
