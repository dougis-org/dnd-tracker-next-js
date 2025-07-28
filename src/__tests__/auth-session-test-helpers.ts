/**
 * Test helpers for SessionManager-based authentication
 * Replaces NextAuth-based test helpers with our custom auth system
 */

import { NextRequest } from 'next/server';
import type { ServerUserInfo } from '@/lib/auth/server-session';

// Mock getServerSession function for tests
export const mockGetServerSession = jest.fn<Promise<ServerUserInfo | null>, [string | null]>();

jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: mockGetServerSession,
}));

/**
 * Default test user info
 */
export const createTestUserInfo = (overrides: Partial<ServerUserInfo> = {}): ServerUserInfo => ({
  userId: 'test-user-123',
  email: 'test@example.com',
  subscriptionTier: 'free',
  ...overrides,
});

/**
 * Mock authenticated request with valid session
 */
export const mockAuthenticatedRequest = (userInfo?: Partial<ServerUserInfo>) => {
  const testUser = createTestUserInfo(userInfo);
  mockGetServerSession.mockResolvedValue(testUser);
  return testUser;
};

/**
 * Mock unauthenticated request (no session)
 */
export const mockUnauthenticatedRequest = () => {
  mockGetServerSession.mockResolvedValue(null);
};

/**
 * Create a NextRequest with session cookie
 */
export const createRequestWithAuth = (
  path: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  userInfo?: Partial<ServerUserInfo>
): NextRequest => {
  // Setup auth mock
  mockAuthenticatedRequest(userInfo);

  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  headers.set('cookie', 'sessionId=test-session-id');
  
  if (body && method !== 'GET') {
    headers.set('content-type', 'application/json');
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

/**
 * Create unauthenticated request
 */
export const createUnauthenticatedRequest = (
  path: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): NextRequest => {
  // Setup unauth mock
  mockUnauthenticatedRequest();

  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  
  if (body && method !== 'GET') {
    headers.set('content-type', 'application/json');
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

/**
 * Test context for API routes with params
 */
export const createTestContext = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

/**
 * Reset auth mocks
 */
export const resetAuthMocks = () => {
  mockGetServerSession.mockReset();
};

/**
 * Expect successful response
 */
export const expectSuccessResponse = (response: Response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
};

/**
 * Expect authentication error
 */
export const expectAuthError = (response: Response) => {
  expect(response.status).toBe(401);
};

/**
 * Expect validation error
 */
export const expectValidationError = (response: Response) => {
  expect(response.status).toBe(400);
};

/**
 * Helper to test API route with authentication
 */
export const testApiRouteAuth = async (
  handler: Function,
  userInfo?: Partial<ServerUserInfo>,
  requestBody?: any,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
) => {
  const request = createRequestWithAuth('/api/test', method, requestBody, userInfo);
  const context = createTestContext(params);
  
  const response = await handler(request, context);
  const data = await response.json();
  
  return { response, data };
};

/**
 * Helper to test API route without authentication
 */
export const testApiRouteUnauth = async (
  handler: Function,
  requestBody?: any,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
) => {
  const request = createUnauthenticatedRequest('/api/test', method, requestBody);
  const context = createTestContext(params);
  
  const response = await handler(request, context);
  const data = await response.json();
  
  return { response, data };
};

/**
 * Setup common test environment
 */
export const setupAuthTestEnvironment = () => {
  beforeEach(() => {
    resetAuthMocks();
  });
  
  afterEach(() => {
    resetAuthMocks();
  });
};

/**
 * Common test users
 */
export const TEST_USERS = {
  FREE_USER: createTestUserInfo({
    userId: 'free-user-123',
    email: 'free@example.com',
    subscriptionTier: 'free',
  }),
  PREMIUM_USER: createTestUserInfo({
    userId: 'premium-user-123',
    email: 'premium@example.com',
    subscriptionTier: 'expert',
  }),
  ADMIN_USER: createTestUserInfo({
    userId: 'admin-user-123',
    email: 'admin@example.com',
    subscriptionTier: 'guild',
  }),
};