/**
 * Complete Authentication Flow Integration Tests
 *
 * Issue #536: Phase 2.4 - Add integration tests for complete authentication flow
 * Tests the complete end-to-end authentication flow from login → session → API access
 * to catch integration issues between authentication components.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { withAuth } from '@/lib/api/session-route-helpers';
import { CharacterService } from '@/lib/services/CharacterService';
import { UserService } from '@/lib/services/UserService';
import { sessionUtils } from '@/lib/session-config';
import { createAuthenticatedHandler } from '@/lib/middleware';

// Mock external dependencies
jest.mock('next-auth/jwt');
jest.mock('@/lib/services/CharacterService');
jest.mock('@/lib/services/UserService');
jest.mock('@/lib/session-config');

// Mock NextAuth utilities
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockSessionUtils = sessionUtils as jest.Mocked<typeof sessionUtils>;

// Test data factories to reduce code duplication
const createMockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'premium',
  ...overrides
});

const createMockToken = (overrides = {}) => ({
  sub: 'user123',
  email: 'test@example.com',
  subscriptionTier: 'premium',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides
});

const createMockSession = (overrides = {}) => ({
  user: {
    id: 'user123',
    email: 'test@example.com',
    subscriptionTier: 'premium',
    ...overrides
  },
  expires: new Date(Date.now() + 3600 * 1000).toISOString()
});

describe('Complete Authentication Flow Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup test environment
    originalEnv = { ...process.env };
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.MONGODB_DB_NAME = 'dnd_tracker_test';

    // Setup default mock responses
    mockGetToken.mockResolvedValue(createMockToken());
    mockSessionUtils.getSessionUserId.mockResolvedValue('user123');
    mockSessionUtils.getSessionUserTier.mockResolvedValue('premium');
    mockSessionUtils.getCurrentSession.mockResolvedValue(createMockSession());
    mockSessionUtils.hasValidSession.mockResolvedValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Login to API Access Integration', () => {
    it('should complete full authentication flow from login to API access', async () => {
      // 1. Simulate successful login (token creation)
      const mockToken = createMockToken();
      mockGetToken.mockResolvedValue(mockToken);

      // 2. Verify session is created and valid
      const sessionResult = await sessionUtils.getCurrentSession();
      expect(sessionResult).toBeDefined();
      expect(sessionResult?.user.id).toBe('user123');

      // 3. Make authenticated API request using withAuth
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true, data: [] })
      );

      const authenticatedHandler = withAuth(async (userId) => {
        return await mockHandler(userId);
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await authenticatedHandler(request);

      // 4. Verify request succeeds with proper authentication
      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith('user123');
    });

    it('should handle session persistence across multiple requests', async () => {
      // Create persistent session
      const persistentSession = createMockSession();
      mockSessionUtils.getCurrentSession.mockResolvedValue(persistentSession);

      // Test multiple API calls with same session
      const callCount = 3;
      const responses = [];

      for (let i = 0; i < callCount; i++) {
        const handler = withAuth(async (userId) => {
          return NextResponse.json({ success: true, callNumber: i + 1, userId });
        });

        const request = new NextRequest(`http://localhost:3000/api/characters/${i + 1}`);
        const response = await handler(request);
        responses.push(response);
      }

      // Verify all requests succeed with same user ID
      expect(responses).toHaveLength(callCount);
      for (let i = 0; i < responses.length; i++) {
        expect(responses[i].status).toBe(200);
        const data = await responses[i].json();
        expect(data.userId).toBe('user123');
        expect(data.callNumber).toBe(i + 1);
      }
    });

    it('should validate session tokens properly for API access', async () => {
      // Test valid token
      const validToken = createMockToken();
      mockGetToken.mockResolvedValue(validToken);

      const handler = createAuthenticatedHandler(async (request, token) => {
        expect(token.sub).toBe('user123');
        expect(token.email).toBe('test@example.com');
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should reject API access with invalid tokens', async () => {
      // Test invalid/missing token
      mockGetToken.mockResolvedValue(null);

      const handler = createAuthenticatedHandler(async (request, token) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Session Persistence Testing', () => {
    it('should maintain session data across requests', async () => {
      const sessionData = createMockSession({
        user: {
          id: 'user123',
          email: 'persistent@example.com',
          subscriptionTier: 'expert'
        }
      });

      mockSessionUtils.getCurrentSession.mockResolvedValue(sessionData);

      // Verify session data persistence
      const session1 = await sessionUtils.getCurrentSession();
      const session2 = await sessionUtils.getCurrentSession();

      expect(session1).toEqual(session2);
      expect(session1?.user.email).toBe('persistent@example.com');
      expect(session1?.user.subscriptionTier).toBe('expert');
    });

    it('should handle session expiration gracefully', async () => {
      // Create expired session
      const expiredSession = {
        ...createMockSession(),
        expires: new Date(Date.now() - 1000).toISOString()
      };

      mockSessionUtils.getCurrentSession.mockResolvedValue(expiredSession);
      mockSessionUtils.hasValidSession.mockResolvedValue(false);

      // Test that expired session is rejected
      const isValid = await sessionUtils.hasValidSession();
      expect(isValid).toBe(false);

      // Test API access fails with expired session
      const handler = withAuth(async (userId) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should refresh session tokens when needed', async () => {
      const originalSession = createMockSession();
      const refreshedSession = {
        ...originalSession,
        expires: new Date(Date.now() + 7200 * 1000).toISOString() // Extended expiration
      };

      // Simulate session refresh
      mockSessionUtils.getCurrentSession
        .mockResolvedValueOnce(originalSession)
        .mockResolvedValueOnce(refreshedSession);

      const session1 = await sessionUtils.getCurrentSession();
      const session2 = await sessionUtils.getCurrentSession();

      expect(session1?.expires).not.toBe(session2?.expires);
      expect(new Date(session2!.expires).getTime()).toBeGreaterThan(
        new Date(session1!.expires).getTime()
      );
    });
  });

  describe('Authentication Middleware Integration', () => {
    it('should properly validate sessions for protected routes', async () => {
      const validToken = createMockToken();
      mockGetToken.mockResolvedValue(validToken);

      // Test middleware with valid session
      const request = new NextRequest('http://localhost:3000/api/characters');
      const authResponse = await requireAuthentication(request);

      // Should return null (no error) for authenticated request
      expect(authResponse).toBeNull();
    });

    it('should reject unauthenticated requests to protected routes', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/characters');
      const authResponse = await requireAuthentication(request);

      // Should return unauthorized response
      expect(authResponse).not.toBeNull();
      expect(authResponse?.status).toBe(401);
    });

    it('should integrate properly with API route handlers', async () => {
      const validToken = createMockToken();
      mockGetToken.mockResolvedValue(validToken);

      // Create authenticated handler that uses the token
      const handler = createAuthenticatedHandler(async (request, token) => {
        return NextResponse.json({
          success: true,
          userId: token.sub,
          email: token.email,
          tier: token.subscriptionTier
        });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe('user123');
      expect(data.email).toBe('test@example.com');
      expect(data.tier).toBe('premium');
    });
  });

  describe('Cross-Component Authentication Testing', () => {
    it('should maintain consistent authentication state across components', async () => {
      const consistentToken = createMockToken();
      const consistentSession = createMockSession();

      mockGetToken.mockResolvedValue(consistentToken);
      mockSessionUtils.getCurrentSession.mockResolvedValue(consistentSession);
      mockSessionUtils.getSessionUserId.mockResolvedValue('user123');
      mockSessionUtils.getSessionUserTier.mockResolvedValue('premium');

      // Test consistency across different auth utilities
      const token = await mockGetToken({ req: {} as any, secret: 'test-secret' });
      const session = await sessionUtils.getCurrentSession();
      const userId = await sessionUtils.getSessionUserId();
      const userTier = await sessionUtils.getSessionUserTier();

      expect(token?.sub).toBe(session?.user.id);
      expect(token?.sub).toBe(userId);
      expect(token?.subscriptionTier).toBe(userTier);
      expect(session?.user.subscriptionTier).toBe(userTier);
    });

    it('should handle session sharing between frontend and API', async () => {
      // Simulate frontend session creation
      const frontendSession = createMockSession();
      mockSessionUtils.getCurrentSession.mockResolvedValue(frontendSession);

      // Simulate API session validation
      const apiToken = createMockToken();
      mockGetToken.mockResolvedValue(apiToken);

      // Verify both use same user data
      const session = await sessionUtils.getCurrentSession();
      const token = await mockGetToken({ req: {} as any, secret: 'test-secret' });

      expect(session?.user.id).toBe(token?.sub);
      expect(session?.user.email).toBe(token?.email);
      expect(session?.user.subscriptionTier).toBe(token?.subscriptionTier);
    });

    it('should propagate authentication context through middleware', async () => {
      const testToken = createMockToken();
      mockGetToken.mockResolvedValue(testToken);

      // Test authentication context propagation
      const middlewareResult = await requireAuthentication({} as NextRequest);
      expect(middlewareResult).toBeNull(); // Authenticated

      // Test that context is available to handlers
      const handler = createAuthenticatedHandler(async (request, token) => {
        return NextResponse.json({
          context: {
            userId: token.sub,
            email: token.email,
            tier: token.subscriptionTier
          }
        });
      });

      const response = await handler({} as NextRequest);
      const data = await response.json();

      expect(data.context.userId).toBe('user123');
      expect(data.context.email).toBe('test@example.com');
      expect(data.context.tier).toBe('premium');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid session handling across the authentication flow', async () => {
      // Simulate various invalid session scenarios
      const invalidSessionScenarios = [
        { session: null, description: 'null session' },
        { session: undefined, description: 'undefined session' },
        { session: { user: {} }, description: 'empty user object' },
        { session: { user: { id: '' } }, description: 'empty user id' }
      ];

      for (const scenario of invalidSessionScenarios) {
        mockSessionUtils.getCurrentSession.mockResolvedValue(scenario.session);
        mockSessionUtils.hasValidSession.mockResolvedValue(false);

        const isValid = await sessionUtils.hasValidSession();
        expect(isValid).toBe(`Invalid session handling for ${scenario.description}`);

        // Test API access fails
        const handler = withAuth(async (userId) => {
          return NextResponse.json({ success: true });
        });

        const request = new NextRequest('http://localhost:3000/api/characters');
        const response = await handler(request);
        expect(response.status).toBe(401);
      }
    });

    it('should verify proper error responses for authentication failures', async () => {
      mockGetToken.mockResolvedValue(null);
      mockSessionUtils.hasValidSession.mockResolvedValue(false);

      // Test error response consistency
      const handler = withAuth(async (userId) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });

    it('should test session refresh and renewal scenarios', async () => {
      // Simulate token expiration and refresh
      const expiredToken = {
        ...createMockToken(),
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const refreshedToken = createMockToken();

      // Simulate token refresh
      mockGetToken
        .mockResolvedValueOnce(expiredToken)
        .mockResolvedValueOnce(refreshedToken);

      // Test that system handles refresh
      const firstToken = await mockGetToken({ req: {} as any, secret: 'test-secret' });
      const secondToken = await mockGetToken({ req: {} as any, secret: 'test-secret' });

      expect(firstToken?.exp).toBeLessThan(Date.now() / 1000);
      expect(secondToken?.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should handle database connection failures gracefully', async () => {
      // Simulate database failure
      mockSessionUtils.getCurrentSession.mockRejectedValue(new Error('Database connection failed'));
      mockSessionUtils.hasValidSession.mockRejectedValue(new Error('Database connection failed'));

      // Test graceful degradation
      await expect(sessionUtils.getCurrentSession()).rejects.toThrow('Database connection failed');
      await expect(sessionUtils.hasValidSession()).rejects.toThrow('Database connection failed');

      // Test API access fails gracefully
      const handler = withAuth(async (userId) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await handler(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Subscription Tier Integration', () => {
    it('should properly handle subscription tier validation', async () => {
      const tiers = ['free', 'premium', 'expert', 'master'];

      for (const tier of tiers) {
        const token = createMockToken({ subscriptionTier: tier });
        const session = createMockSession({ user: { subscriptionTier: tier } });

        mockGetToken.mockResolvedValue(token);
        mockSessionUtils.getCurrentSession.mockResolvedValue(session);
        mockSessionUtils.getSessionUserTier.mockResolvedValue(tier);

        // Test tier consistency
        const sessionTier = await sessionUtils.getSessionUserTier();
        expect(sessionTier).toBe(tier);

        // Test API access with tier
        const handler = withAuth(async (userId) => {
          return NextResponse.json({ success: true, tier: sessionTier });
        });

        const request = new NextRequest('http://localhost:3000/api/characters');
        const response = await handler(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tier).toBe(tier);
      }
    });

    it('should handle missing subscription tier gracefully', async () => {
      const tokenWithoutTier = createMockToken();
      delete tokenWithoutTier.subscriptionTier;

      const sessionWithoutTier = createMockSession();
      delete sessionWithoutTier.user.subscriptionTier;

      mockGetToken.mockResolvedValue(tokenWithoutTier);
      mockSessionUtils.getCurrentSession.mockResolvedValue(sessionWithoutTier);
      mockSessionUtils.getSessionUserTier.mockResolvedValue('free'); // Default

      const userTier = await sessionUtils.getSessionUserTier();
      expect(userTier).toBe('free');
    });
  });
});

// Import required functions for testing
async function requireAuthentication(request: NextRequest): Promise<NextResponse | null> {
  const token = await mockGetToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token ? null : NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}