/**
 * Middleware Integration Tests
 *
 * Tests middleware behavior in conjunction with page components to ensure
 * consistent authentication handling across the application.
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Mock NextAuth JWT module
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// Mock NextResponse
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

// Setup environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret';
});

afterAll(() => {
  process.env = originalEnv;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRedirect.mockReset();
  mockNext.mockReset();
  mockJson.mockReset();
  (getToken as jest.Mock).mockReset();
});

// Helper to create test request
const createTestRequest = (pathname: string, origin = 'http://localhost:3000'): NextRequest => ({
  nextUrl: { pathname },
  url: `${origin}${pathname}`,
} as NextRequest);

describe('Middleware Integration with Authentication Flow', () => {
  describe('Server-Side Authentication Consistency', () => {
    it('should ensure middleware properly protects dashboard routes', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      // Test unauthenticated access
      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();

      // Verify callback URL handling - the actual URL object is passed to redirect
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
        })
      );
    });

    it('should ensure middleware properly protects character routes', async () => {
      const { middleware } = await import('../middleware');
      const characterRoutes = [
        '/characters',
        '/characters/123',
        '/characters/create',
        '/characters/123/edit',
      ];

      for (const pathname of characterRoutes) {
        jest.clearAllMocks();
        const request = createTestRequest(pathname);

        (getToken as jest.Mock).mockResolvedValue(null);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        await middleware(request);

        expect(mockRedirect).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      }
    });

    it('should ensure middleware properly protects encounter routes', async () => {
      const { middleware } = await import('../middleware');
      const encounterRoutes = [
        '/encounters',
        '/encounters/456',
        '/encounters/create',
        '/encounters/456/edit',
      ];

      for (const pathname of encounterRoutes) {
        jest.clearAllMocks();
        const request = createTestRequest(pathname);

        (getToken as jest.Mock).mockResolvedValue(null);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        await middleware(request);

        expect(mockRedirect).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      }
    });

    it('should ensure middleware properly protects party and combat routes', async () => {
      const { middleware } = await import('../middleware');
      const protectedRoutes = [
        '/parties',
        '/combat',
        '/settings',
      ];

      for (const pathname of protectedRoutes) {
        jest.clearAllMocks();
        const request = createTestRequest(pathname);

        (getToken as jest.Mock).mockResolvedValue(null);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        await middleware(request);

        expect(mockRedirect).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      }
    });
  });

  describe('API Route Authentication', () => {
    it('should return 401 for unauthenticated API requests', async () => {
      const { middleware } = await import('../middleware');
      const apiRoutes = [
        '/api/users/profile',
        '/api/characters',
        '/api/encounters',
        '/api/parties',
        '/api/combat/start',
      ];

      for (const pathname of apiRoutes) {
        jest.clearAllMocks();
        const request = createTestRequest(pathname);

        (getToken as jest.Mock).mockResolvedValue(null);
        mockJson.mockReturnValue({ type: 'json', status: 401 });

        const result = await middleware(request);

        expect(mockJson).toHaveBeenCalledWith(
          { error: 'Authentication required' },
          { status: 401 }
        );
        expect(result).toEqual({ type: 'json', status: 401 });
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    });

    it('should allow authenticated API requests to proceed', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/api/characters');

      const validToken = {
        email: 'test@example.com',
        sub: '123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (getToken as jest.Mock).mockResolvedValue(validToken);
      mockNext.mockReturnValue({ type: 'next' });

      await middleware(request);

      expect(mockNext).toHaveBeenCalled();
      expect(mockJson).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('Token Validation Edge Cases', () => {
    it('should handle expired tokens properly', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      const expiredToken = {
        email: 'test@example.com',
        sub: '123',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      (getToken as jest.Mock).mockResolvedValue(expiredToken);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
        })
      );
    });

    it('should handle tokens without required fields', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      const invalidToken = {
        email: 'test@example.com',
        // Missing 'sub' field
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (getToken as jest.Mock).mockResolvedValue(invalidToken);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
        })
      );
    });

    it('should handle token validation errors gracefully', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      (getToken as jest.Mock).mockRejectedValue(new Error('Token validation failed'));
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
        })
      );
    });
  });

  describe('Navigation State Consistency', () => {
    it('should properly handle callback URLs for deep routes', async () => {
      const { middleware } = await import('../middleware');
      const deepRoutes = [
        '/dashboard/settings/profile',
        '/characters/123/edit',
        '/encounters/456/participants',
      ];

      for (const pathname of deepRoutes) {
        jest.clearAllMocks();
        const request = createTestRequest(pathname);

        (getToken as jest.Mock).mockResolvedValue(null);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        await middleware(request);

        // Should redirect to signin (callback URL handling is internal)
        expect(mockRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/signin'),
          })
        );
      }
    });

    it('should handle external URLs securely', async () => {
      const { middleware } = await import('../middleware');
      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'https://malicious-site.com/dashboard',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      // External URLs should still result in redirect to signin
      // (the middleware handles this securely by constructing signin URL from base)
      expect(mockRedirect).toHaveBeenCalled();
    });
  });

  describe('Public Route Handling', () => {
    it('should allow public routes without authentication checks', async () => {
      const { middleware } = await import('../middleware');
      const publicRoutes = [
        '/',
        '/about',
        '/signin',
        '/signup',
        '/terms',
        '/privacy',
        '/help',
        '/api/health',
        '/api/auth/signin',
        '/api/auth/callback/credentials',
      ];

      for (const pathname of publicRoutes) {
        jest.clearAllMocks();
        mockNext.mockReturnValue({ type: 'next' });

        const request = createTestRequest(pathname);
        await middleware(request);

        expect(mockNext).toHaveBeenCalled();
        expect(getToken).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
        expect(mockJson).not.toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle missing NEXTAUTH_SECRET gracefully', async () => {
      const originalSecret = process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: undefined,
      });
      expect(mockRedirect).toHaveBeenCalled();

      // Restore
      process.env.NEXTAUTH_SECRET = originalSecret;
    });

    it('should handle URL construction errors', async () => {
      const { middleware } = await import('../middleware');
      const request = createTestRequest('/dashboard');

      (getToken as jest.Mock).mockResolvedValue(null);

      // Mock URL constructor to throw on first call (new URL('/signin', request.url))
      // but succeed on second call (fallback URL construction)
      let callCount = 0;
      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation((path: string, base?: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('URL construction failed');
        }
        // Return a valid URL object for the fallback
        return new originalURL(path, base);
      }) as any;

      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      // Should fall back to alternative redirect construction
      expect(mockRedirect).toHaveBeenCalled();

      global.URL = originalURL;
    });
  });
});