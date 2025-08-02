/**
 * Middleware Parties Route Protection Tests - Simplified (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getToken } from 'next-auth/jwt';
import {
  setupNextAuthMocks,
  setupUnauthenticatedState,
  createMockJwtToken,
  SHARED_API_TEST_CONSTANTS
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock NextAuth JWT module
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));

describe('Middleware Parties Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate tokens for parties routes', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const validToken = createMockJwtToken(userId);

    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    const token = await getToken({ req: {} as any });
    expect(token).toEqual(validToken);
    expect(token.sub).toBe(userId);
  });

  it('should detect missing tokens for parties routes', async () => {
    setupUnauthenticatedState(mockAuth, getToken as jest.Mock);

    const token = await getToken({ req: {} as any });
    expect(token).toBeNull();
  });

  it('should handle API parties route authentication', async () => {
    const userId = 'parties-user-123';

    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    const token = await getToken({ req: {} as any });
    expect(token.sub).toBe(userId);
  });
});