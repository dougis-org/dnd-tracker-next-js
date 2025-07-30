import { NextRequest } from 'next/server';

/**
 * Shared API Test Helpers
 *
 * This module consolidates common test patterns and utilities used across
 * all API route tests to eliminate code duplication.
 */

// ============================================================================
// STANDARD TEST CONSTANTS
// ============================================================================

export const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: '507f1f77bcf86cd799439011',
  TEST_EMAIL: 'test@example.com',
  DEFAULT_USER_ID: '507f1f77bcf86cd799439011',
  TEST_SUBSCRIPTION_TIER: 'free' as const,
  TEST_USER_NAME: 'John Doe',
} as const;

// ============================================================================
// MOCK SESSION FACTORIES
// ============================================================================

/**
 * Creates a standard mock session for authentication testing (NextAuth compatible)
 */
export const createMockSession = (
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
  overrides: Partial<any> = {}
) => {
  const baseSession = {
    user: {
      id: userId,
      email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
      name: SHARED_API_TEST_CONSTANTS.TEST_USER_NAME,
      subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
    },
    expires: '2024-12-31T23:59:59.999Z',
  };

  return {
    ...baseSession,
    ...overrides,
    user: {
      ...baseSession.user,
      ...(overrides.user || {}),
    },
  };
};

/**
 * Creates a mock session expectation object for testing assertions
 */
export const createSessionExpectation = (userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) =>
  expect.objectContaining({
    user: expect.objectContaining({
      id: userId,
    }),
  });

/**
 * Creates a realistic NextAuth JWT token for testing
 */
export const createMockJwtToken = (
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
  overrides: Partial<any> = {}
) => ({
  sub: userId,
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
  firstName: 'John',
  lastName: 'Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  jti: 'test-jwt-id',
  ...overrides,
});

/**
 * Creates a JWT token expectation object for testing assertions
 */
export const createTokenExpectation = (userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) =>
  expect.objectContaining({
    sub: userId,
  });

/**
 * Creates mock parameters for API routes
 */
export const createMockParams = (id: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) =>
  Promise.resolve({ id });

// ============================================================================
// REQUEST BUILDERS
// ============================================================================

/**
 * Creates a mock NextRequest for API testing
 */
export const createMockRequest = (data: any, method: 'PATCH' | 'GET' | 'POST' | 'DELETE' = 'PATCH') => ({
  json: jest.fn().mockResolvedValue(data),
  method,
  headers: new Headers({
    'content-type': 'application/json',
  }),
}) as unknown as NextRequest;

/**
 * Creates a mock user object for testing
 */
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

/**
 * Creates a mock credentials object for testing authentication
 */
export const createMockCredentials = (overrides: Partial<any> = {}) => ({
  email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  password: 'test-password-123',
  rememberMe: false,
  ...overrides,
});

/**
 * Creates a standard request body for profile updates
 */
export const createRequestBody = (overrides: Partial<any> = {}) => ({
  displayName: 'John Doe',
  timezone: 'America/New_York',
  dndEdition: 'Pathfinder 2e',
  experienceLevel: 'experienced',
  primaryRole: 'dm',
  ...overrides,
});

// ============================================================================
// RESPONSE ASSERTION UTILITIES
// ============================================================================

/**
 * Standard success response assertions
 */
export const expectSuccessResponse = async (response: Response, expectedData: any) => {
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data).toEqual({
    success: true,
    ...expectedData,
  });
};

/**
 * Standard error response assertions
 */
export const expectErrorResponse = async (
  response: Response,
  status: number,
  message: string,
  expectErrors: boolean = false
) => {
  const data = await response.json();
  expect(response.status).toBe(status);
  expect(data.success).toBe(false);
  expect(data.error || data.message).toBe(message);
  if (expectErrors) {
    expect(Array.isArray(data.errors)).toBe(true);
  }
};

/**
 * Standard authentication error assertion
 */
export const expectAuthenticationError = async (response: Response) => {
  await expectErrorResponse(response, 401, 'Authentication required');
};

/**
 * Standard authorization error assertion
 */
export const expectAuthorizationError = async (response: Response, message: string = 'You can only access your own profile') => {
  await expectErrorResponse(response, 403, message);
};

/**
 * Standard validation error assertion
 */
export const expectValidationError = async (response: Response, expectedField?: string) => {
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.success).toBe(false);
  if (expectedField) {
    expect(data.message || data.error).toContain(expectedField);
  }
};

/**
 * Standard server error assertion
 */
export const expectServerError = async (response: Response, message: string = 'Internal server error') => {
  await expectErrorResponse(response, 500, message);
};

// ============================================================================
// TEST EXECUTION UTILITIES
// ============================================================================

/**
 * Standard test setup for API tests
 */
export const setupAPITest = () => {
  jest.clearAllMocks();
};

/**
 * Standard beforeEach setup for API route tests with authentication
 */
export const setupAPITestWithAuth = (
  mockAuth: jest.MockedFunction<any>,
  mockUserService?: jest.Mocked<any>,
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID
) => {
  setupAPITest();
  mockAuth.mockResolvedValue(createMockSession(userId));
};

/**
 * Setup NextAuth mocks for session-based authentication tests
 */
export const setupNextAuthMocks = (
  mockAuth: jest.MockedFunction<any>,
  mockGetToken?: jest.MockedFunction<any>,
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID
) => {
  setupAPITest();

  // Mock the auth() function to return a session
  mockAuth.mockResolvedValue(createMockSession(userId));

  // Mock getToken if provided
  if (mockGetToken) {
    mockGetToken.mockResolvedValue(createMockJwtToken(userId));
  }
};

/**
 * Setup unauthenticated state for testing 401 responses
 */
export const setupUnauthenticatedState = (
  mockAuth: jest.MockedFunction<any>,
  mockGetToken?: jest.MockedFunction<any>
) => {
  setupAPITest();

  // Mock no session
  mockAuth.mockResolvedValue(null);

  // Mock no token if provided
  if (mockGetToken) {
    mockGetToken.mockResolvedValue(null);
  }
};

/**
 * Execute a test request and return both response and parsed data
 */
export const executeTestRequest = async (
  handler: Function,
  request: NextRequest,
  params: any
) => {
  const response = await handler(request, params);
  const data = await response.json();
  return { response, data };
};

// ============================================================================
// NEXTAUTH-COMPATIBLE REQUEST BUILDERS
// ============================================================================

/**
 * Creates an authenticated request that works with NextAuth-based API routes
 * This replaces the old header-based authentication pattern
 */
export const createAuthenticatedRequest = (
  url: string,
  options: any = {},
  mockAuth?: jest.MockedFunction<any>,
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID
) => {
  // If mockAuth is provided, set up the mock
  if (mockAuth) {
    mockAuth.mockResolvedValue(createMockSession(userId));
  }

  return createMockRequest(
    options.body || {},
    options.method || 'GET'
  );
};

/**
 * Creates an unauthenticated request for testing 401 responses
 */
export const createUnauthenticatedRequest = (
  url: string,
  options: any = {},
  mockAuth?: jest.MockedFunction<any>
) => {
  // If mockAuth is provided, set up the mock to return null
  if (mockAuth) {
    mockAuth.mockResolvedValue(null);
  }

  return createMockRequest(
    options.body || {},
    options.method || 'GET'
  );
};

// ============================================================================
// API ROUTE EXECUTION HELPERS
// ============================================================================

/**
 * Standard factory for API route test execution functions
 */
export const createRouteTestExecutor = (
  handler: Function,
  baseUrl: string = '/api/users'
) => {
  return async (
    userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
    requestData?: any,
    method: 'GET' | 'PATCH' | 'POST' | 'DELETE' = 'GET'
  ) => {
    const mockRequest = new NextRequest(`http://localhost:3000${baseUrl}/${userId}/profile`, {
      method,
      body: requestData ? JSON.stringify(requestData) : undefined,
      headers: {
        'content-type': 'application/json',
      },
    });

    // Mock the json() method for requests with body data
    if (requestData) {
      (mockRequest as any).json = jest.fn().mockResolvedValue(requestData);
    }

    const params = createMockParams(userId);
    return handler(mockRequest, { params });
  };
};

/**
 * Executes a common auth test pattern and validates the response
 */
export const executeAuthTest = async (
  apiFunction: Function,
  mockAuth: jest.MockedFunction<any>,
  expectedStatus: number,
  expectedMessage: string,
  ...args: any[]
) => {
  const request = createUnauthenticatedRequest('http://localhost:3000/api/test', {}, mockAuth);
  const response = await apiFunction(request, ...args);
  await expectErrorResponse(response, expectedStatus, expectedMessage);
};

/**
 * Common test helper that executes a mock function and validates against expected result
 */
export const executeAndValidateMock = async (
  mockFn: jest.MockedFunction<any>,
  expectedResult: any
) => {
  const result = await mockFn();
  expect(result).toEqual(expectedResult);
  return result;
};

/**
 * Common test helper for validating mock setup with both session and token
 */
export const validateMockSetup = async (
  mockAuth: jest.MockedFunction<any>,
  mockGetToken: jest.MockedFunction<any>,
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID
) => {
  const session = await executeAndValidateMock(mockAuth, createSessionExpectation(userId));
  const token = await executeAndValidateMock(mockGetToken, createTokenExpectation(userId));
  return { session, token };
};
