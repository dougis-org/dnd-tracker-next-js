import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createAuthenticatedHandler,
  requireAuthentication,
  isProtectedApiRoute,
  extractBearerToken,
  ApiResponse,
  SessionUtils,
} from '../middleware';

// Mock Clerk auth
jest.mock('@clerk/nextjs/server');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

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
    it('should return error response when no user is authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).not.toBeNull();
      // Check that it's an unauthorized response
      expect(result?.status).toBe(401);
    });

    it('should return null when user is authenticated', async () => {
      mockAuth.mockResolvedValue({ 
        userId: 'user_123', 
        sessionId: 'session_123' 
      });

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).toBeNull();
    });

    it('should handle authentication errors', async () => {
      mockAuth.mockRejectedValue(new Error('Authentication failed'));

      const result = await requireAuthentication(mockRequest as NextRequest);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });
  });

  describe('createAuthenticatedHandler', () => {
    const mockHandler = jest.fn();

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should call handler when authentication passes', async () => {
      const userId = 'user_123';
      mockAuth.mockResolvedValue({ 
        userId, 
        sessionId: 'session_123' 
      });
      mockHandler.mockResolvedValue(NextResponse.json({ success: true }));

      const authenticatedHandler = createAuthenticatedHandler(mockHandler);
      const result = await authenticatedHandler(mockRequest as NextRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, userId);
      expect(result).toEqual(NextResponse.json({ success: true }));
    });

    it('should return 401 when authentication fails', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const authenticatedHandler = createAuthenticatedHandler(mockHandler);
      const result = await authenticatedHandler(mockRequest as NextRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result?.status).toBe(401);
    });

    it('should handle handler errors gracefully', async () => {
      const userId = 'user_123';
      mockAuth.mockResolvedValue({ 
        userId, 
        sessionId: 'session_123' 
      });
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
      it('should return false when user is not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        const result = await SessionUtils.hasSubscriptionTier('premium');
        expect(result).toBe(false);
      });

      it('should return false for authenticated user (not yet implemented)', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_123' });
        const result = await SessionUtils.hasSubscriptionTier('premium');
        // Currently returns false as implementation is not complete
        expect(result).toBe(false);
      });

      it('should handle authentication errors', async () => {
        mockAuth.mockRejectedValue(new Error('Auth failed'));
        const result = await SessionUtils.hasSubscriptionTier('premium');
        expect(result).toBe(false);
      });
    });

    describe('getUserId', () => {
      it('should return null when user is not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        const result = await SessionUtils.getUserId();
        expect(result).toBeNull();
      });

      it('should return user ID when authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_123' });
        const result = await SessionUtils.getUserId();
        expect(result).toBe('user_123');
      });

      it('should handle authentication errors', async () => {
        mockAuth.mockRejectedValue(new Error('Auth failed'));
        const result = await SessionUtils.getUserId();
        expect(result).toBeNull();
      });
    });

    describe('getUserEmail', () => {
      it('should return null when user is not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        const result = await SessionUtils.getUserEmail();
        expect(result).toBeNull();
      });

      it('should return null for authenticated user (not yet implemented)', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_123' });
        const result = await SessionUtils.getUserEmail();
        // Currently returns null as implementation is not complete
        expect(result).toBeNull();
      });

      it('should handle authentication errors', async () => {
        mockAuth.mockRejectedValue(new Error('Auth failed'));
        const result = await SessionUtils.getUserEmail();
        expect(result).toBeNull();
      });
    });

    describe('isAuthenticated', () => {
      it('should return false when user is not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        const result = await SessionUtils.isAuthenticated();
        expect(result).toBe(false);
      });

      it('should return true when user is authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_123' });
        const result = await SessionUtils.isAuthenticated();
        expect(result).toBe(true);
      });

      it('should handle authentication errors', async () => {
        mockAuth.mockRejectedValue(new Error('Auth failed'));
        const result = await SessionUtils.isAuthenticated();
        expect(result).toBe(false);
      });
    });

    describe('getAuthDebugInfo', () => {
      it('should return debug info when authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_123' });
        const result = await SessionUtils.getAuthDebugInfo();
        expect(result).toEqual({
          isAuthenticated: true,
          userId: 'user_123',
          error: null
        });
      });

      it('should return debug info when not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        const result = await SessionUtils.getAuthDebugInfo();
        expect(result).toEqual({
          isAuthenticated: false,
          userId: null,
          error: null
        });
      });

      it('should return error info when authentication fails', async () => {
        mockAuth.mockRejectedValue(new Error('Auth failed'));
        const result = await SessionUtils.getAuthDebugInfo();
        expect(result).toEqual({
          isAuthenticated: false,
          userId: null,
          error: 'Auth failed'
        });
      });
    });
  });
});
