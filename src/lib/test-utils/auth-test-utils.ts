/**
 * Authentication Test Utilities
 * 
 * Separate utility file to avoid Jest module mapping conflicts with shared-clerk-test-helpers.
 * Use this file for authentication state setup in tests.
 */

// Test constants
export const AUTH_TEST_CONSTANTS = {
  TEST_USER_ID: 'test-user-123',
} as const;

/**
 * Standard authenticated user session for all tests
 */
export function createStandardAuthenticatedSession(userId: string = 'test-user-123') {
  return {
    userId,
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    },
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
    getToken: async () => null,
    has: () => true,
    debug: () => ({}),
    isAuthenticated: true,
  };
}

/**
 * Setup authenticated state for server-side auth mocking
 */
export function setupAuthenticatedState(mockAuth: jest.MockedFunction<any>, userId: string = 'test-user-123') {
  mockAuth.mockResolvedValue(createStandardAuthenticatedSession(userId));
}

/**
 * Setup unauthenticated state (null session)
 */
export function setupUnauthenticatedState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue(null);
}

/**
 * Setup session without userId (incomplete auth)
 */
export function setupIncompleteAuthState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue({
    ...createStandardAuthenticatedSession(''),
    userId: null,
    user: null,
    isAuthenticated: false,
  });
}