/**
 * Shared Clerk Test Helpers
 *
 * Utilities for Clerk authentication mocking in tests.
 */

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: 'test-user-123',
};

export function createMockClerkSession(userId: string) {
  return {
    userId,
    publicMetadata: { role: 'user' },
    sessionClaims: {
      sub: userId,
      __raw: '',
      iss: 'https://clerk.example.com',
      sid: 'sid-123',
      nbf: 0,
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    },
    sessionId: 'sess-123',
    sessionStatus: 'active' as any,
    actor: undefined,
    tokenType: 'session_token' as const,
    getToken: async () => null,
    has: () => true,
    debug: () => ({}),
    isAuthenticated: true,
    orgId: undefined,
    orgRole: undefined,
    orgSlug: undefined,
    orgPermissions: [],
    factorVerificationAge: null,
  };
}

export function setupClerkMocks(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockReset();
}

export function setupClerkUnauthenticatedState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue({ userId: undefined });
}
