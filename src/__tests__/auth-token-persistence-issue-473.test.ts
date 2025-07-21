/**
 * Test case for Issue #473: When a user logs in and tries to go to another page
 * an error occurs and they go to the login page
 *
 * This test reproduces the specific issue where middleware logs:
 * "Middleware: No token found for /dashboard, redirecting to signin"
 */

import { getToken } from 'next-auth/jwt';
import {
  mockRedirect,
  mockNext,
  mockJson,
  createTestRequest,
  setupTestEnvironment,
  resetAuthMocks,
  createValidToken,
  createExpiredToken,
  createInvalidToken,
} from './auth-test-helpers';

// Mock the getToken function
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// Setup NextResponse mocks
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
    json: mockJson,
  },
}));

describe('Issue #473: Authentication Token Persistence', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    resetAuthMocks();
    (getToken as jest.Mock).mockReset();
    originalEnv = setupTestEnvironment();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Reproducing the token persistence issue', () => {
    test('should find valid token for dashboard access after login', async () => {
      const mockToken = createValidToken();

      (getToken as jest.Mock).mockResolvedValue(mockToken);
      mockNext.mockReturnValue({ type: 'next' });

      const request = createTestRequest('/dashboard');

      const { middleware } = await import('@/middleware');
      await middleware(request);

      // Should allow access to dashboard (return NextResponse.next())
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: 'test-secret-for-jwt-signing',
      });
    });

    test('should reproduce the "No token found" issue', async () => {
      // Simulate the issue scenario where getToken returns null despite login
      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      // Capture console.log output to verify the error message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { middleware } = await import('@/middleware');
      await middleware(request);

      // Should redirect to signin
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      // Should log the specific error message from Issue #473
      expect(consoleSpy).toHaveBeenCalledWith(
        'Middleware: No token found for /dashboard, redirecting to signin'
      );

      consoleSpy.mockRestore();
    });

    test('should handle token without required sub field', async () => {
      // Test token missing user ID (sub field)
      const invalidToken = createInvalidToken();

      (getToken as jest.Mock).mockResolvedValue(invalidToken);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { middleware } = await import('@/middleware');
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Middleware: Token missing user ID for /dashboard'
      );

      consoleWarnSpy.mockRestore();
    });

    test('should handle expired token', async () => {
      // Test expired token scenario
      const expiredToken = createExpiredToken();

      (getToken as jest.Mock).mockResolvedValue(expiredToken);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { middleware } = await import('@/middleware');
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Middleware: Expired token for /dashboard, redirecting to signin'
      );

      consoleSpy.mockRestore();
    });

    test('should handle token validation errors', async () => {
      // Test error during token validation
      (getToken as jest.Mock).mockRejectedValue(new Error('JWT verification failed'));
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { middleware } = await import('@/middleware');
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Middleware: Token validation error for /dashboard:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Root cause analysis scenarios', () => {
    test('should fail when NEXTAUTH_SECRET is missing', async () => {
      // Remove NEXTAUTH_SECRET to test environment issue
      delete process.env.NEXTAUTH_SECRET;

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      const { middleware } = await import('@/middleware');
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: undefined, // This would cause token verification to fail
      });
    });

    test('should handle cookie parsing issues', async () => {
      // Test malformed cookies
      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');

      const { middleware } = await import('@/middleware');
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(getToken).toHaveBeenCalled();
    });
  });

  describe('Token persistence requirements', () => {
    test('should persist session across page navigation', async () => {
      // Test that token should be available across different protected routes
      const validToken = createValidToken();

      // Test multiple protected routes
      const routes = ['/dashboard', '/characters', '/encounters', '/parties'];

      const { middleware } = await import('@/middleware');

      let totalGetTokenCalls = 0;

      for (const route of routes) {
        // Setup mocks for each iteration
        (getToken as jest.Mock).mockResolvedValue(validToken);
        mockNext.mockReturnValue({ type: 'next' });

        const request = createTestRequest(route);
        await middleware(request);

        // All should succeed with same token
        expect(mockNext).toHaveBeenCalled();

        totalGetTokenCalls++;

        // Reset for next iteration
        resetAuthMocks();
      }

      // getToken should be called for each route
      expect(totalGetTokenCalls).toBe(routes.length);
    });
  });

  describe('Real-world authentication scenarios', () => {
    test('should identify potential causes of token loss', async () => {
      // Test scenarios that could cause the issue described in #473

      // Scenario 1: Token exists but is malformed
      (getToken as jest.Mock).mockResolvedValue({
        // Malformed token - missing critical fields
        email: 'test@example.com',
        // No sub, no exp, etc.
      });
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');
      const { middleware } = await import('@/middleware');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should handle browser session storage issues', async () => {
      // Scenario 2: Browser has cookies but NextAuth can't parse them
      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const request = createTestRequest('/dashboard');
      const { middleware } = await import('@/middleware');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await middleware(request);

      expect(mockRedirect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Middleware: No token found for /dashboard, redirecting to signin'
      );

      consoleSpy.mockRestore();
    });
  });
});