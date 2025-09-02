import { NextRequest } from 'next/server';

/**
 * Shared API Test Helpers
 *
 * Simplified utilities for API route testing.
 */

// Type definitions for better type safety
interface ClerkSessionClaims {
  sub: string;
  __raw: string;
  iss: string;
  sid: string;
  nbf: number;
  exp: number;
  iat: number;
}

interface MockSessionOverrides {
  userId?: string;
  publicMetadata?: Record<string, any>;
  sessionClaims?: Partial<ClerkSessionClaims>;
  sessionId?: string;
  sessionStatus?: any;
  actor?: any;
  tokenType?: string;
  getToken?: () => Promise<any>;
  has?: () => boolean;
  debug?: () => any;
  isAuthenticated?: boolean;
  orgId?: string;
  orgRole?: string;
  orgSlug?: string;
  orgPermissions?: any[];
  factorVerificationAge?: number | null;
}

interface MockJwtTokenOverrides {
  sub?: string;
  email?: string;
  subscriptionTier?: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

interface MockUserOverrides {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  dndEdition?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  primaryRole?: 'player' | 'dm' | 'both';
  subscriptionTier?: string;
}

interface MockCredentialsOverrides {
  email?: string;
  password?: string;
  rememberMe?: boolean;
}

interface RequestBodyOverrides {
  displayName?: string;
  timezone?: string;
  dndEdition?: string;
  experienceLevel?: string;
  primaryRole?: string;
}

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: '507f1f77bcf86cd799439011',
  TEST_EMAIL: 'test@example.com',
  DEFAULT_USER_ID: '507f1f77bcf86cd799439011',
  TEST_SUBSCRIPTION_TIER: 'free' as const,
  TEST_USER_NAME: 'John Doe',
} as const;

export const createMockSession = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID, overrides: MockSessionOverrides = {}) => {
  const baseSession = {
    userId,
    publicMetadata: { role: 'user' },
    sessionClaims: {
      sub: userId,
      __raw: '',
      iss: 'https://clerk.example.com',
      sid: 'sid-123',
      nbf: 0,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
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
  return {
    ...baseSession,
    ...overrides,
  };
};

export const createMockJwtToken = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID, overrides: MockJwtTokenOverrides = {}) => ({
  sub: userId,
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
  firstName: 'John',
  lastName: 'Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  jti: 'test-jwt-id',
  ...overrides,
});

export const createMockRequest = (data: any, method = 'PATCH') => ({
  json: jest.fn().mockResolvedValue(data),
  method,
  headers: new Headers({ 'content-type': 'application/json' }),
}) as unknown as NextRequest;

export const createMockUser = (overrides: MockUserOverrides = {}) => ({
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

export const createMockCredentials = (overrides: MockCredentialsOverrides = {}) => ({
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

// Essential functions that other tests depend on
export const createMockParams = (id = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => Promise.resolve({ id });

export const setupClerkMocks = (mockAuth: jest.MockedFunction<any>, mockGetToken?: jest.MockedFunction<any>, userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(createMockSession(userId));
  if (mockGetToken) {
    mockGetToken.mockResolvedValue(createMockJwtToken(userId));
  }
};

export const setupUnauthenticatedState = (mockAuth: jest.MockedFunction<any>, mockGetToken?: jest.MockedFunction<any>) => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  if (mockGetToken) {
    mockGetToken.mockResolvedValue(null);
  }
};

export const createUnauthenticatedRequest = (url: string, options: any = {}, mockAuth?: jest.MockedFunction<any>) => {
  if (mockAuth) {
    mockAuth.mockResolvedValue(null);
  }
  return createMockRequest(options.body || {}, options.method || 'GET');
};

export const createAuthenticatedRequest = (url: string, options: any = {}, mockAuth?: jest.MockedFunction<any>, userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => {
  if (mockAuth) {
    mockAuth.mockResolvedValue(createMockSession(userId));
  }
  return createMockRequest(options.body || {}, options.method || 'GET');
};

export const expectAuthenticationError = async (response: Response) => {
  await expectErrorResponse(response, 401, 'Authentication required');
};

export const expectValidationError = async (response: Response, expectedField?: string) => {
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.success).toBe(false);
  if (expectedField) {
    expect(data.message || data.error).toContain(expectedField);
  }
};

export const expectAuthorizationError = async (response: Response, message = 'You can only access your own profile') => {
  await expectErrorResponse(response, 403, message);
};

export const createRequestBody = (overrides: RequestBodyOverrides = {}) => ({
  displayName: 'John Doe',
  timezone: 'America/New_York',
  dndEdition: 'Pathfinder 2e',
  experienceLevel: 'experienced',
  primaryRole: 'dm',
  ...overrides,
});

// Additional functions that tests depend on
export const createSessionExpectation = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) =>
  expect.objectContaining({
    user: expect.objectContaining({
      id: userId,
    }),
  });

export const createTokenExpectation = (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) =>
  expect.objectContaining({
    sub: userId,
  });

export const setupAPITestWithAuth = (mockAuth: jest.MockedFunction<any>, mockUserService?: jest.Mocked<any>, userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(createMockSession(userId));
};

export const executeAndValidateMock = async (mockFn: jest.MockedFunction<any>, expectedResult: any) => {
  const result = await mockFn();
  expect(result).toEqual(expectedResult);
  return result;
};

export const validateMockSetup = async (mockAuth: jest.MockedFunction<any>, mockGetToken: jest.MockedFunction<any>, userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => {
  const session = await executeAndValidateMock(mockAuth, createSessionExpectation(userId));
  const token = await executeAndValidateMock(mockGetToken, createTokenExpectation(userId));
  return { session, token };
};

export const createRouteTestExecutor = (handler: Function, baseUrl = '/api/users') => {
  return async (userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID, requestData?: any, method: 'GET' | 'PATCH' | 'POST' | 'DELETE' = 'GET') => {
    const mockRequest = new NextRequest(`http://localhost:3000${baseUrl}/${userId}/profile`, {
      method,
      body: requestData ? JSON.stringify(requestData) : undefined,
      headers: { 'content-type': 'application/json' },
    });

    if (requestData) {
      (mockRequest as any).json = jest.fn().mockResolvedValue(requestData);
    }

    const params = createMockParams(userId);
    return handler(mockRequest, { params });
  };
};
