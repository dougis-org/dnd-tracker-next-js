/**
 *Middleware Tests
 *
 *This test file validates the Next.js middleware for route protection.
 *It tests authentication checks, redirects, and protected route access.
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
  // Reset mocks
  mockRedirect.mockReset();
  mockNext.mockReset();
  mockJson.mockReset();
  (getToken as jest.Mock).mockReset();
});

// Helper functions to reduce code duplication
const createTestRequest = (pathname: string): NextRequest => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
} as NextRequest);

const testProtectedRoute = async (pathname: string): Promise<void> => {
  const { middleware } = await import('../middleware');
  const request = createTestRequest(pathname);

  (getToken as jest.Mock).mockResolvedValue(null);

  await middleware(request);

  expect(getToken).toHaveBeenCalledWith({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
};

describe('Middleware Route Protection', () => {
  describe('Protected Route Detection', () => {
    it('should identify dashboard routes as protected', async () => {
      await testProtectedRoute('/dashboard');
    });

    it('should identify characters routes as protected', async () => {
      await testProtectedRoute('/characters/create');
    });

    it('should identify encounters routes as protected', async () => {
      await testProtectedRoute('/encounters/new');
    });

    it('should identify combat routes as protected', async () => {
      await testProtectedRoute('/combat/123');
    });

    it('should identify settings routes as protected', async () => {
      await testProtectedRoute('/settings');
    });
  });

  describe('Public Route Handling', () => {
    it('should allow access to public routes without authentication', async () => {
      const { middleware } = await import('../middleware');

      const publicRoutes = [
        '/',
        '/about',
        '/signin',
        '/signup',
        '/auth/error',
        '/api/health',
      ];

      for (const pathname of publicRoutes) {
        mockNext.mockReturnValue({ type: 'next' });

        const request = {
          nextUrl: { pathname },
          url: `http://localhost:3000${pathname}`,
        } as NextRequest;

        const result = await middleware(request);

        expect(result).toBeDefined();
        expect(getToken).not.toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
        mockNext.mockReset();
        (getToken as jest.Mock).mockReset();
      }
    });
  });

  describe('Authentication Checks', () => {
    it('should redirect unauthenticated users from protected routes', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const _result = await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
          searchParams: expect.any(Object),
        })
      );
    });

    it('should include callback URL in redirect', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard/characters' },
        url: 'http://localhost:3000/dashboard/characters',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);

      // Mock URL constructor and redirect
      const mockUrl = {
        href: 'http://localhost:3000/signin?callbackUrl=http%3A//localhost%3A3000/dashboard/characters',
        searchParams: {
          set: jest.fn(),
        },
      };

      // Mock global URL constructor
      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation(() => mockUrl) as any;

      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(mockUrl.searchParams.set).toHaveBeenCalledWith(
        'callbackUrl',
        encodeURI('http://localhost:3000/dashboard/characters')
      );
      expect(mockRedirect).toHaveBeenCalledWith(mockUrl);

      // Restore original URL
      global.URL = originalURL;
    });

    it('should allow authenticated users to access protected routes', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      const mockToken = {
        email: 'test@example.com',
        sub: '123',
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      (getToken as jest.Mock).mockResolvedValue(mockToken);
      mockNext.mockReturnValue({ type: 'next' });

      const _result = await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users from settings page to signin', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/settings' },
        url: 'http://localhost:3000/settings',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      const _result = await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/signin'),
          searchParams: expect.any(Object),
        })
      );
    });

    it('should return 401 JSON response for unauthenticated API requests', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/api/users/123' },
        url: 'http://localhost:3000/api/users/123',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);

      const mockJsonResponse = { type: 'json', status: 401 };
      mockJson.mockReturnValue(mockJsonResponse);

      const result = await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Authentication required' },
        { status: 401 }
      );
      expect(result).toBe(mockJsonResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested protected routes', async () => {
      const { middleware } = await import('../middleware');

      const nestedRoutes = [
        '/dashboard/settings/profile',
        '/characters/123/edit',
        '/encounters/456/participants',
        '/combat/789/round/1',
        '/settings/profile',
        '/settings/notifications',
      ];

      for (const pathname of nestedRoutes) {
        (getToken as jest.Mock).mockResolvedValue(null);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        const request = {
          nextUrl: { pathname },
          url: `http://localhost:3000${pathname}`,
        } as NextRequest;

        await middleware(request);

        expect(getToken).toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
        mockRedirect.mockReset();
        (getToken as jest.Mock).mockReset();
      }
    });

    it('should handle getToken errors gracefully', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      (getToken as jest.Mock).mockRejectedValue(
        new Error('Token validation failed')
      );
      mockRedirect.mockReturnValue({ type: 'redirect' });

      // Middleware should catch errors and redirect to signin
      const result = await middleware(request);

      expect(result).toBeDefined();
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should handle missing NEXTAUTH_SECRET', async () => {
      const originalSecret = process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);
      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(getToken).toHaveBeenCalledWith({
        req: request,
        secret: undefined,
      });

      // Restore secret
      process.env.NEXTAUTH_SECRET = originalSecret;
    });
  });

  describe('Middleware Configuration', () => {
    it('should export correct matcher configuration', async () => {
      const middlewareModule = await import('../middleware');

      expect(middlewareModule.config).toBeDefined();
      expect(middlewareModule.config.matcher).toEqual([
        '/dashboard/:path*',
        '/characters/:path*',
        '/encounters/:path*',
        '/parties/:path*',
        '/combat/:path*',
        '/settings/:path*',
        '/api/users/:path*',
        '/api/characters/:path*',
        '/api/encounters/:path*',
        '/api/combat/:path*',
        '/api/parties/:path*',
      ]);
    });
  });

  describe('URL Construction', () => {
    it('should construct signin URL correctly with /signin path', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      (getToken as jest.Mock).mockResolvedValue(null);

      // Mock URL to track constructor calls
      const mockUrl = {
        href: 'http://localhost:3000/signin',
        searchParams: {
          set: jest.fn(),
        },
      };

      const originalURL = global.URL;
      global.URL = jest.fn().mockImplementation((path, base) => {
        expect(path).toBe('/signin');
        expect(base).toBe('http://localhost:3000/dashboard');
        return mockUrl;
      }) as any;

      mockRedirect.mockReturnValue({ type: 'redirect' });

      await middleware(request);

      expect(global.URL).toHaveBeenCalledWith(
        '/signin',
        'http://localhost:3000/dashboard'
      );

      // Restore original URL
      global.URL = originalURL;
    });
  });

  describe('Token Validation', () => {
    it('should accept valid tokens with all required fields', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      const validTokens = [
        { email: 'test@example.com', sub: '123' },
        { email: 'user@test.com', sub: '456', name: 'Test User' },
        {
          email: 'admin@example.com',
          sub: '789',
          name: 'Admin',
          subscriptionTier: 'premium',
          iat: Date.now(),
          exp: Date.now() + 3600,
        },
      ];

      for (const token of validTokens) {
        (getToken as jest.Mock).mockResolvedValue(token);
        mockNext.mockReturnValue({ type: 'next' });

        const _result = await middleware(request);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
        mockNext.mockReset();
        (getToken as jest.Mock).mockReset();
      }
    });

    it('should reject falsy tokens', async () => {
      const { middleware } = await import('../middleware');

      const request = {
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard',
      } as NextRequest;

      const invalidTokens = [null, undefined, false, 0, ''];

      for (const token of invalidTokens) {
        (getToken as jest.Mock).mockResolvedValue(token);
        mockRedirect.mockReturnValue({ type: 'redirect' });

        await middleware(request);

        expect(mockRedirect).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
        mockRedirect.mockReset();
        (getToken as jest.Mock).mockReset();
      }
    });
  });
});
