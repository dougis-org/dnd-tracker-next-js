import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  createAuthenticatedHandler,
  requireAuthentication,
  isProtectedApiRoute,
  extractBearerToken,
  ApiResponse,
  SessionUtils,
} from '../middleware';

// Mock NextAuth JWT
jest.mock('next-auth/jwt');
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

// Mock Next.js server functions
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
    next: jest.fn(),
  },
}));

describe('API Middleware', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      url: 'http://localhost:3000/api/test',
      headers: new Headers(),
    };
    (NextResponse.json as jest.Mock).mockImplementation((data, init) => ({
      json: data,
      status: init?.status || 200,
    }));
    (NextResponse.next as jest.Mock).mockReturnValue({ next: true });
  });

  describe('requireAuthentication', () => {
    it('should return error response when no token is provided', async () => {
      mockGetToken.mockResolvedValue(null);

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).toEqual({
        json: { error: 'Authentication required' },
        status: 401,
      });
    });

    it('should return null when token is valid', async () => {
      const mockToken = {
        email: 'test@example.com',
        sub: '123',
        subscriptionTier: 'free',
      };
      mockGetToken.mockResolvedValue(mockToken);

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).toBeNull();
    });

    it('should handle token verification errors', async () => {
      mockGetToken.mockRejectedValue(new Error('Token verification failed'));

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).toEqual({
        json: { error: 'Authentication required' },
        status: 401,
      });
    });
  });

  describe('createAuthenticatedHandler', () => {
    const mockHandler = jest.fn();

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should call handler when authentication passes', async () => {
      const mockToken = {
        email: 'test@example.com',
        sub: '123',
        subscriptionTier: 'free',
      };
      mockGetToken.mockResolvedValue(mockToken);
      mockHandler.mockResolvedValue(NextResponse.json({ success: true }));

      const authenticatedHandler = createAuthenticatedHandler(mockHandler);
      const result = await authenticatedHandler(mockRequest as NextRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockToken);
      expect(result).toEqual(NextResponse.json({ success: true }));
    });

    it('should return 401 when authentication fails', async () => {
      mockGetToken.mockResolvedValue(null);

      const authenticatedHandler = createAuthenticatedHandler(mockHandler);
      const result = await authenticatedHandler(mockRequest as NextRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toEqual({
        json: { error: 'Authentication required' },
        status: 401,
      });
    });

    it('should handle handler errors gracefully', async () => {
      const mockToken = {
        email: 'test@example.com',
        sub: '123',
        subscriptionTier: 'free',
      };
      mockGetToken.mockResolvedValue(mockToken);
      mockHandler.mockRejectedValue(new Error('Handler error'));

      const authenticatedHandler = createAuthenticatedHandler(mockHandler);
      const result = await authenticatedHandler(mockRequest as NextRequest);

      expect(result).toEqual({
        json: { error: 'Internal server error' },
        status: 500,
      });
    });
  });

  describe('isProtectedApiRoute', () => {
    it('should return true for protected API routes', () => {
      expect(isProtectedApiRoute('/api/users')).toBe(true);
      expect(isProtectedApiRoute('/api/characters')).toBe(true);
      expect(isProtectedApiRoute('/api/encounters')).toBe(true);
      expect(isProtectedApiRoute('/api/combat')).toBe(true);
    });

    it('should return false for public API routes', () => {
      expect(isProtectedApiRoute('/api/auth/signin')).toBe(false);
      expect(isProtectedApiRoute('/api/auth/register')).toBe(false);
      expect(isProtectedApiRoute('/api/health')).toBe(false);
      expect(isProtectedApiRoute('/api/public')).toBe(false);
    });

    it('should return false for non-API routes', () => {
      expect(isProtectedApiRoute('/dashboard')).toBe(false);
      expect(isProtectedApiRoute('/characters')).toBe(false);
    });
  });

  describe('extractBearerToken', () => {
    it('should extract bearer token from Authorization header', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Bearer test-token-123');

      const token = extractBearerToken(headers);

      expect(token).toBe('test-token-123');
    });

    it('should return null when no Authorization header', () => {
      const headers = new Headers();

      const token = extractBearerToken(headers);

      expect(token).toBeNull();
    });

    it('should return null when Authorization header is not Bearer', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Basic dGVzdA==');

      const token = extractBearerToken(headers);

      expect(token).toBeNull();
    });

    it('should return null when Bearer token is empty', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Bearer ');

      const token = extractBearerToken(headers);

      expect(token).toBeNull();
    });
  });

  describe('ApiResponse helper', () => {
    it('should create success response', () => {
      const data = { message: 'Success' };
      const response = ApiResponse.success(data);

      expect(response).toEqual(NextResponse.json(data));
    });

    it('should create error response with custom status', () => {
      const response = ApiResponse.error('Bad request', 400);

      expect(response).toEqual(
        NextResponse.json({ error: 'Bad request' }, { status: 400 })
      );
    });

    it('should create unauthorized response', () => {
      const response = ApiResponse.unauthorized();

      expect(response).toEqual(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      );
    });

    it('should create server error response', () => {
      const response = ApiResponse.serverError('Database error');

      expect(response).toEqual(
        NextResponse.json({ error: 'Database error' }, { status: 500 })
      );
    });

    it('should create forbidden response', () => {
      const response = ApiResponse.forbidden('Access denied');

      expect(response).toEqual(
        NextResponse.json({ error: 'Access denied' }, { status: 403 })
      );
    });

    it('should create forbidden response with default message', () => {
      const response = ApiResponse.forbidden();

      expect(response).toEqual(
        NextResponse.json({ error: 'Access denied' }, { status: 403 })
      );
    });

    it('should create not found response', () => {
      const response = ApiResponse.notFound('Resource not found');

      expect(response).toEqual(
        NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      );
    });

    it('should create not found response with default message', () => {
      const response = ApiResponse.notFound();

      expect(response).toEqual(
        NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      );
    });
  });

  describe('SessionUtils', () => {
    describe('hasSubscriptionTier', () => {
      it('should return false for null token', () => {
        const result = SessionUtils.hasSubscriptionTier(null, 'premium');
        expect(result).toBe(false);
      });

      it('should return true for exact tier match', () => {
        const token = { subscriptionTier: 'premium' } as any;
        const result = SessionUtils.hasSubscriptionTier(token, 'premium');
        expect(result).toBe(true);
      });

      it('should return true for higher tier', () => {
        const token = { subscriptionTier: 'pro' } as any;
        const result = SessionUtils.hasSubscriptionTier(token, 'basic');
        expect(result).toBe(true);
      });

      it('should return false for lower tier', () => {
        const token = { subscriptionTier: 'basic' } as any;
        const result = SessionUtils.hasSubscriptionTier(token, 'pro');
        expect(result).toBe(false);
      });

      it('should default to free tier when no subscriptionTier', () => {
        const token = {} as any;
        const result = SessionUtils.hasSubscriptionTier(token, 'free');
        expect(result).toBe(true);
      });
    });

    describe('getUserId', () => {
      it('should return null for null token', () => {
        const result = SessionUtils.getUserId(null);
        expect(result).toBeNull();
      });

      it('should return null for token without sub', () => {
        const token = {} as any;
        const result = SessionUtils.getUserId(token);
        expect(result).toBeNull();
      });

      it('should return user ID from token', () => {
        const token = { sub: 'user-123' } as any;
        const result = SessionUtils.getUserId(token);
        expect(result).toBe('user-123');
      });
    });

    describe('getUserEmail', () => {
      it('should return null for null token', () => {
        const result = SessionUtils.getUserEmail(null);
        expect(result).toBeNull();
      });

      it('should return null for token without email', () => {
        const token = {} as any;
        const result = SessionUtils.getUserEmail(token);
        expect(result).toBeNull();
      });

      it('should return email from token', () => {
        const token = { email: 'test@example.com' } as any;
        const result = SessionUtils.getUserEmail(token);
        expect(result).toBe('test@example.com');
      });
    });

    describe('isTokenExpired', () => {
      it('should return true for null token', () => {
        const result = SessionUtils.isTokenExpired(null);
        expect(result).toBe(true);
      });

      it('should return true for token without exp', () => {
        const token = {} as any;
        const result = SessionUtils.isTokenExpired(token);
        expect(result).toBe(true);
      });

      it('should return true for expired token', () => {
        const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        const token = { exp: expiredTime } as any;
        const result = SessionUtils.isTokenExpired(token);
        expect(result).toBe(true);
      });

      it('should return false for valid token', () => {
        const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const token = { exp: futureTime } as any;
        const result = SessionUtils.isTokenExpired(token);
        expect(result).toBe(false);
      });
    });
  });
});
