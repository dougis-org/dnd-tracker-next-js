/**
 * Authentication Integration Tests - Middleware Integration (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getToken } from 'next-auth/jwt';
import {
  createMockJwtToken,
  setupNextAuthMocks,
  setupUnauthenticatedState,
  SHARED_API_TEST_CONSTANTS
} from '@/lib/test-utils/shared-api-test-helpers';

const mockAuth = jest.fn();

// Setup mocks
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));

describe('Auth Integration - Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate tokens for protected routes', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const validToken = createMockJwtToken(userId);

    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    const token = await getToken({ req: {} as any });
    expect(token).toEqual(validToken);
    expect(token.sub).toBe(userId);
  });

  it('should detect missing tokens for protected routes', async () => {
    setupUnauthenticatedState(mockAuth, getToken as jest.Mock);

    const token = await getToken({ req: {} as any });
    expect(token).toBeNull();
  });

  it('should handle API route authentication', async () => {
    const userId = 'api-user-123';

    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    const token = await getToken({ req: {} as any });
    expect(token.sub).toBe(userId);
  });
});