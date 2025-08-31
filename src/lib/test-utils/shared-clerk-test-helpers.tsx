/**
 * Shared Clerk Test Helpers
 *
 * Utilities for Clerk authentication mocking in tests.
 * This file also serves as a mock for @clerk/nextjs imports.
 */
import React from 'react';

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: 'test-user-123',
};

// ============================================================================
// CENTRALIZED AUTHENTICATION MOCK HELPERS
// ============================================================================

/**
 * Standard authenticated user session for all tests
 * Use this consistently across all test files
 */
export function createStandardAuthenticatedSession(userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) {
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
 * All tests expecting authenticated users should use this
 */
export function setupAuthenticatedState(mockAuth: jest.MockedFunction<any>, userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) {
  mockAuth.mockResolvedValue(createStandardAuthenticatedSession(userId));
}

/**
 * Setup unauthenticated state (null session)
 * All tests expecting redirect to signin should use this
 */
export function setupUnauthenticatedState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue(null);
}

/**
 * Setup session without userId (incomplete auth)
 * All tests expecting authentication failure should use this
 */
export function setupIncompleteAuthState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue({ userId: null, user: {} });
}

/**
 * Setup client-side authentication hooks for authenticated state
 * All component tests expecting authenticated users should use this
 */
export function setupClientSideAuthenticatedState(userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) {
  const user = {
    id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  useAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId,
  });

  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user,
  });

  useSession.mockReturnValue({
    data: { user },
    status: 'authenticated',
    update: jest.fn(),
  });
}

/**
 * Setup client-side authentication hooks for unauthenticated state
 * All component tests expecting signin redirect should use this
 */
export function setupClientSideUnauthenticatedState() {
  useAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
  });

  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  });

  useSession.mockReturnValue({
    data: null,
    status: 'unauthenticated',
    update: jest.fn(),
  });
}

/**
 * Test helper for pages that should redirect unauthenticated users
 * All page tests expecting signin redirect should use this pattern
 */
export async function expectSigninRedirect(pageComponent: Function, expectedCallbackUrl: string) {
  await expect(pageComponent()).rejects.toThrow(`REDIRECT: /signin?callbackUrl=${expectedCallbackUrl}`);
}

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

export function setupClerkUnauthenticatedState(
  mockAuth: jest.MockedFunction<any>
) {
  mockAuth.mockResolvedValue({ userId: undefined });
}

// Mock Clerk hooks and components for Jest
export const useAuth = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
}));

export const useUser = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: false,
  user: null,
}));

export const useClerk = jest.fn(() => ({
  signOut: jest.fn(),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
}));

export const SignIn = jest.fn(({ children, ...props }) => (
  <div data-testid="clerk-signin-component" {...props}>
    {children}
  </div>
));

export const SignUp = jest.fn(({ children, ...props }) => (
  <div data-testid="clerk-signup-component" {...props}>
    {children}
  </div>
));

export const ClerkProvider = jest.fn(({ children }) => children);

export const SignedIn = jest.fn(({ children }) => children);

export const SignedOut = jest.fn(({ children }) => children);

export const UserButton = jest.fn(() => (
  <div data-testid="clerk-user-button">User Menu</div>
));

// Server-side exports
export const auth = jest.fn(() => Promise.resolve({ userId: null }));

export const currentUser = jest.fn(() => Promise.resolve(null));

// NextAuth compatibility exports for tests that haven't been migrated yet
export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
  update: jest.fn(),
}));

export const SessionProvider = jest.fn(({ children }) => children);

export const signIn = jest.fn();
export const signOut = jest.fn();

// MongoDB Adapter mock for compatibility
export const MongoDBAdapter = jest.fn(() => ({
  createUser: jest.fn(),
  getUser: jest.fn(),
  getUserByEmail: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
}));

const clerkTestHelpers = {
  useAuth,
  useUser,
  useClerk,
  SignIn,
  SignUp,
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  auth,
  currentUser,
  // NextAuth compatibility
  useSession,
  SessionProvider,
  signIn,
  signOut,
  MongoDBAdapter,
};

export default clerkTestHelpers;
