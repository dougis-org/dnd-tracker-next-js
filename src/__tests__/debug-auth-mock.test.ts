/**
 * Debug test to verify auth mocking works correctly
 */

import { mockGetServerSession, TEST_USERS, createAuthenticatedRequest } from './auth-session-test-helpers';

describe('Auth Mock Debug', () => {
  it('should properly mock getServerSession', async () => {
    // Test that the mock function exists
    expect(mockGetServerSession).toBeDefined();
    expect(typeof mockGetServerSession).toBe('function');

    // Test that we can set a return value
    mockGetServerSession.mockResolvedValue(TEST_USERS.FREE_USER);

    // Test that the mock returns the expected value
    const result = await mockGetServerSession('test-cookie');
    expect(result).toEqual(TEST_USERS.FREE_USER);
    expect(result?.userId).toBe('free-user-123');
  });

  it('should create authenticated request with cookie', () => {
    const request = createAuthenticatedRequest('/api/test', 'GET', undefined, TEST_USERS.FREE_USER);

    // Verify the request has the expected cookie
    expect(request.headers.get('cookie')).toBe('sessionId=test-session-id-123');
    expect(request.url).toBe('http://localhost:3000/api/test');
    expect(request.method).toBe('GET');
  });

  it('should verify mock is called with cookie header', async () => {
    // Import the function that should call getServerSession
    const { validateAuthentication } = await import('@/lib/api/auth-middleware');

    // Create a request
    const request = createAuthenticatedRequest('/api/test', 'GET', undefined, TEST_USERS.FREE_USER);

    // Call validateAuthentication
    const result = await validateAuthentication(request);

    // Verify the mock was called with the cookie header
    expect(mockGetServerSession).toHaveBeenCalledWith('sessionId=test-session-id-123');
    expect(result.userId).toBe('free-user-123');
  });
});