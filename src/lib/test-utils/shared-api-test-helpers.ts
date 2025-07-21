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
} as const;

// ============================================================================
// MOCK SESSION FACTORIES
// ============================================================================

/**
 * Creates a standard mock session for authentication testing
 */
export const createMockSession = (userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID) => ({
  user: {
    id: userId,
    email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
  },
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
  displayName: 'John Doe',
  timezone: 'America/New_York',
  dndEdition: 'Pathfinder 2e',
  experienceLevel: 'experienced' as const,
  primaryRole: 'dm' as const,
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
  mockUserService: jest.Mocked<any>,
  userId: string = SHARED_API_TEST_CONSTANTS.TEST_USER_ID
) => {
  setupAPITest();
  mockAuth.mockResolvedValue({
    ...createMockSession(userId),
    expires: '2024-12-31',
  });
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
