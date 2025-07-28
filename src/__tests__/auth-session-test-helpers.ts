/**
 * Centralized Test Helpers for SessionManager-based Authentication
 * 
 * This file provides a complete testing infrastructure for the new auth middleware system.
 * It replaces all previous NextAuth-based test helpers with SessionManager-compatible ones.
 */

import { NextRequest } from 'next/server';
import type { ServerUserInfo } from '@/lib/auth/server-session';

// Mock the server-session module BEFORE any imports
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Import and get the mocked function
import { getServerSession } from '@/lib/auth/server-session';
export const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

/**
 * Test user profiles for different subscription tiers
 */
export const TEST_USERS = {
  FREE_USER: {
    userId: 'free-user-123',
    email: 'free@example.com',
    subscriptionTier: 'free' as const,
  },
  SEASONED_USER: {
    userId: 'seasoned-user-123', 
    email: 'seasoned@example.com',
    subscriptionTier: 'seasoned' as const,
  },
  EXPERT_USER: {
    userId: 'expert-user-123',
    email: 'expert@example.com', 
    subscriptionTier: 'expert' as const,
  },
  MASTER_USER: {
    userId: 'master-user-123',
    email: 'master@example.com',
    subscriptionTier: 'master' as const,
  },
  GUILD_USER: {
    userId: 'guild-user-123',
    email: 'guild@example.com',
    subscriptionTier: 'guild' as const,
  },
} as const;

/**
 * Create a test user with custom properties
 */
export function createTestUser(overrides: Partial<ServerUserInfo> = {}): ServerUserInfo {
  return {
    userId: 'test-user-123',
    email: 'test@example.com',
    subscriptionTier: 'free',
    ...overrides,
  };
}

/**
 * Mock successful authentication with specified user
 */
export function mockAuthenticatedUser(userInfo: ServerUserInfo = TEST_USERS.FREE_USER): void {
  mockGetServerSession.mockResolvedValue(userInfo);
}

/**
 * Mock failed authentication (no session)
 */
export function mockUnauthenticatedUser(): void {
  mockGetServerSession.mockResolvedValue(null);
}

/**
 * Reset all authentication mocks
 */
export function resetAuthMocks(): void {
  // Only clear call history, don't reset implementations
  mockGetServerSession.mockClear();
}

/**
 * Create a NextRequest with proper session cookie for authenticated requests
 */
export function createAuthenticatedRequest(
  url: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  userInfo: ServerUserInfo = TEST_USERS.FREE_USER
): NextRequest {
  // Set up auth mock
  mockAuthenticatedUser(userInfo);
  
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  const headers = new Headers();
  
  // Add session cookie that the auth middleware expects
  headers.set('cookie', 'sessionId=test-session-id-123');
  
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

  return new NextRequest(fullUrl, requestInit);
}

/**
 * Create a NextRequest without authentication
 */
export function createUnauthenticatedRequest(
  url: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): NextRequest {
  // Set up unauth mock
  mockUnauthenticatedUser();
  
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
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

  return new NextRequest(fullUrl, requestInit);
}

/**
 * Create test context for API route params
 */
export function createTestContext(params: Record<string, string> = {}): { params: Promise<Record<string, string>> } {
  return {
    params: Promise.resolve(params),
  };
}

/**
 * Helper to test authenticated API routes
 */
export async function testAuthenticatedRoute(
  handler: Function,
  options: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    user?: ServerUserInfo;
    params?: Record<string, string>;
  } = {}
) {
  const {
    url = '/api/test',
    method = 'GET',
    body,
    user = TEST_USERS.FREE_USER,
    params = {},
  } = options;

  const request = createAuthenticatedRequest(url, method, body, user);
  const context = createTestContext(params);

  const response = await handler(request, context);
  const data = await response.json();

  return { response, data, user };
}

/**
 * Helper to test unauthenticated API routes
 */
export async function testUnauthenticatedRoute(
  handler: Function,
  options: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    params?: Record<string, string>;
  } = {}
) {
  const {
    url = '/api/test',
    method = 'GET', 
    body,
    params = {},
  } = options;

  const request = createUnauthenticatedRequest(url, method, body);
  const context = createTestContext(params);

  const response = await handler(request, context);
  const data = await response.json();

  return { response, data };
}

/**
 * Response assertion helpers
 */
export function expectSuccessResponse(response: Response, expectedStatus: number = 200): void {
  expect(response.status).toBe(expectedStatus);
}

export function expectErrorResponse(response: Response, expectedStatus: number = 500): void {
  expect(response.status).toBe(expectedStatus);
}

export function expectAuthenticationError(response: Response): void {
  expect(response.status).toBe(401);
}

export function expectValidationError(response: Response): void {
  expect(response.status).toBe(400);
}

export function expectNotFoundError(response: Response): void {
  expect(response.status).toBe(404);
}

export function expectForbiddenError(response: Response): void {
  expect(response.status).toBe(403);
}

/**
 * Data assertion helpers
 */
export function expectSuccessData(data: any): void {
  expect(data.success).toBe(true);
  expect(data.data).toBeDefined();
}

export function expectErrorData(data: any, errorMessage?: string): void {
  expect(data.success).toBe(false);
  if (errorMessage) {
    expect(data.message || data.error).toContain(errorMessage);
  }
}

/**
 * Common test setup for API route test suites
 */
export function setupApiRouteTests(): void {
  beforeEach(() => {
    resetAuthMocks();
  });

  afterEach(() => {
    resetAuthMocks();
  });
}

/**
 * Legacy compatibility functions for existing tests
 * These are deprecated - use the new functions above
 */
export const testApiRouteAuth = testAuthenticatedRoute;
export const testApiRouteUnauth = testUnauthenticatedRoute;
export const expectAuthError = expectAuthenticationError;