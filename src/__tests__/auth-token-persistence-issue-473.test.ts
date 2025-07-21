/**
 * Test case for Issue #473: When a user logs in and tries to go to another page
 * an error occurs and they go to the login page
 *
 * This test reproduces the specific issue where middleware logs:
 * "Middleware: No token found for /dashboard, redirecting to signin"
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Mock the getToken function
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// Mock NextResponse to match existing test pattern
const mockRedirect = jest.fn();
const mockNext = jest.fn();
const mockJson = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
    json: mockJson,
  },
}));

// Mock environment variables
const originalEnv = process.env;

// Helper function to create test requests
const createTestRequest = (pathname: string): NextRequest => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
} as NextRequest);

describe('Issue #473: Authentication Token Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockReset();
    mockNext.mockReset();
    mockJson.mockReset();
    (getToken as jest.Mock).mockReset();

    process.env = {
      ...originalEnv,
      NEXTAUTH_SECRET: 'test-secret-for-jwt-signing',
      NEXTAUTH_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Reproducing the token persistence issue', () => {
    test('should find valid token for dashboard access after login', async () => {
      // Simulate a valid JWT token that should exist after login
      const mockToken = {
        sub: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        iat: Math.floor(Date.now() / 1000),
        subscriptionTier: 'free',
      };

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
      const invalidToken = {
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        // Missing 'sub' field
      };

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
      const expiredToken = {
        sub: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };

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
      const validToken = {
        sub: 'user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        subscriptionTier: 'free',
      };

      (getToken as jest.Mock).mockResolvedValue(validToken);
      mockNext.mockReturnValue({ type: 'next' });

      // Test multiple protected routes
      const routes = ['/dashboard', '/characters', '/encounters', '/parties'];

      const { middleware } = await import('@/middleware');

      for (const route of routes) {
        const request = createTestRequest(route);
        await middleware(request);

        // All should succeed with same token
        expect(mockNext).toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
        mockNext.mockReturnValue({ type: 'next' });
        (getToken as jest.Mock).mockResolvedValue(validToken);
      }

      // getToken should be called for each route
      expect(getToken).toHaveBeenCalledTimes(routes.length);
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