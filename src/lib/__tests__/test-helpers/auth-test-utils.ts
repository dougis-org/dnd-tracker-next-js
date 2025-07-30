/**
 * Shared test utilities for authentication tests (Issue #524)
 * Reduces code duplication across authentication and session test files
 */

// Common mock data
export const mockUsers = {
  premium: {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    subscriptionTier: 'premium',
  },
  free: {
    id: 'user456',
    email: 'free@example.com',
    firstName: 'Free',
    lastName: 'User',
    subscriptionTier: 'free',
  }
};

export const mockSessions = {
  valid: {
    user: { email: 'test@example.com', id: 'user123', subscriptionTier: 'premium' }
  },
  withoutUser: {},
  empty: null,
  undefined: undefined
};

// Console mock utilities
export function createConsoleMocks() {
  return {
    error: jest.spyOn(console, 'error').mockImplementation(),
    log: jest.spyOn(console, 'log').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
  };
}

export function restoreConsoleMocks(mocks: ReturnType<typeof createConsoleMocks>) {
  Object.values(mocks).forEach(mock => mock.mockRestore());
}

// Mock auth factory
export function createMockAuth() {
  return jest.fn();
}

// Service result builders
export function createSuccessServiceResult(user: any, requiresVerification = false) {
  return {
    success: true,
    data: { user, requiresVerification },
  };
}

export function createFailureServiceResult() {
  return {
    success: false,
    data: null,
  };
}

// Common test data generators
export function generateCredentials(overrides: any = {}) {
  return {
    email: 'test@example.com',
    password: 'password123',
    rememberMe: 'true',
    ...overrides,
  };
}

export function generateSessionTestCases() {
  return [
    { name: 'valid session', session: mockSessions.valid, expected: true },
    { name: 'null session', session: mockSessions.empty, expected: false },
    { name: 'undefined session', session: mockSessions.undefined, expected: false },
    { name: 'empty session', session: mockSessions.withoutUser, expected: false },
  ];
}

// Test environment utilities
export function setEnvironmentVariable(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

export function withIsolatedModules<T>(callback: () => T): T {
  return jest.isolateModules(callback);
}

// Session utility test helpers
export function createSessionTestData() {
  return {
    validSession: { user: { id: 'user123', subscriptionTier: 'premium' } },
    emptySession: {},
    nullSession: null,
    undefinedSession: undefined,
    sessionWithoutId: { user: { subscriptionTier: 'premium' } },
    sessionWithFalsyId: { user: { id: '', subscriptionTier: 'premium' } },
    sessionWithZeroId: { user: { id: 0, subscriptionTier: 'free' } },
    sessionWithNullTier: { user: { id: 'user123', subscriptionTier: null } },
  };
}

// Common session test patterns
export function runSessionTests(mockAuth: jest.Mock, testFn: Function, testCases: any[]) {
  return Promise.all(
    testCases.map(async ({ session, expected }) => {
      mockAuth.mockResolvedValue(session);
      const result = await testFn(mockAuth);
      expect(result).toBe(expected);
    })
  );
}