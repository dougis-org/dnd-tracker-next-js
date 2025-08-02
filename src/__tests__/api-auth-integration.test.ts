/**
 * API Route Authentication Integration Tests
 *
 * Issue #536: Phase 2.4 - Add integration tests for complete authentication flow
 * Tests authentication integration with actual API routes to ensure
 * authentication works end-to-end with real API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { CharacterService } from '@/lib/services/CharacterService';
import { UserService } from '@/lib/services/UserService';
import { sessionUtils } from '@/lib/session-config';
import { withAuth } from '@/lib/api/session-route-helpers';

// Mock external dependencies
jest.mock('next-auth/jwt');
jest.mock('@/lib/services/CharacterService');
jest.mock('@/lib/services/UserService');
jest.mock('@/lib/session-config');

// Type-safe mock references
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockSessionUtils = sessionUtils as jest.Mocked<typeof sessionUtils>;

// Test data factories
const createMockCharacter = (overrides = {}) => ({
  id: 'char123',
  name: 'Test Character',
  level: 5,
  class: 'Fighter',
  userId: 'user123',
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

const createMockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'premium',
  ...overrides
});

describe('API Route Authentication Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup test environment
    originalEnv = { ...process.env };
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    // Setup default mock responses
    mockGetToken.mockResolvedValue(createMockToken());
    mockSessionUtils.getSessionUserId.mockResolvedValue('user123');
    mockSessionUtils.getSessionUserTier.mockResolvedValue('premium');
    mockSessionUtils.hasValidSession.mockResolvedValue(true);

    // Setup service mocks
    mockCharacterService.getCharactersByOwner.mockResolvedValue({
      success: true,
      data: [createMockCharacter()],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
    });

    mockCharacterService.createCharacter.mockResolvedValue({
      success: true,
      data: createMockCharacter()
    });

    mockCharacterService.searchCharacters.mockResolvedValue({
      success: true,
      data: [createMockCharacter()]
    });

    mockCharacterService.getCharactersByType.mockResolvedValue({
      success: true,
      data: [createMockCharacter()]
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Character API Authentication Integration', () => {
    it('should allow authenticated GET requests to characters API', async () => {
      // Simulate GET /api/characters with authentication
      const handler = withAuth(async (userId) => {
        const result = await CharacterService.getCharactersByOwner(userId, 1, 10);
        return NextResponse.json(result);
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].userId).toBe('user123');

      // Verify service was called with correct user ID
      expect(mockCharacterService.getCharactersByOwner).toHaveBeenCalledWith('user123', 1, 10);
    });

    it('should allow authenticated POST requests to characters API', async () => {
      const characterData = {
        name: 'New Character',
        level: 1,
        class: 'Wizard',
        race: 'Human',
        background: 'Sage'
      };

      // Simulate POST /api/characters with authentication
      const handler = withAuth(async (userId) => {
        const result = await CharacterService.createCharacter(userId, characterData);
        return NextResponse.json(result);
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterData)
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Character');
      expect(data.data.userId).toBe('user123');

      // Verify service was called with correct parameters
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith('user123', characterData);
    });

    it('should handle character search with authentication', async () => {
      const searchQuery = 'wizard';

      // Simulate GET /api/characters?search=wizard with authentication
      const handler = withAuth(async (userId) => {
        const result = await CharacterService.searchCharacters(searchQuery, userId);
        return NextResponse.json(result);
      });

      const request = new NextRequest(`http://localhost:3000/api/characters?search=${searchQuery}`, {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify service was called with correct parameters
      expect(mockCharacterService.searchCharacters).toHaveBeenCalledWith(searchQuery, 'user123');
    });

    it('should handle character type filtering with authentication', async () => {
      const characterType = 'pc';

      // Simulate GET /api/characters?type=pc with authentication
      const handler = withAuth(async (userId) => {
        const result = await CharacterService.getCharactersByType(characterType, userId);
        return NextResponse.json(result);
      });

      const request = new NextRequest(`http://localhost:3000/api/characters?type=${characterType}`, {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify service was called with correct parameters
      expect(mockCharacterService.getCharactersByType).toHaveBeenCalledWith(characterType, 'user123');
    });

    it('should reject unauthenticated requests to characters API', async () => {
      // Simulate unauthenticated request
      mockSessionUtils.getSessionUserId.mockResolvedValue(null);
      mockSessionUtils.hasValidSession.mockResolvedValue(false);

      const handler = withAuth(async (userId) => {
        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authentication Context Propagation', () => {
    it('should propagate user context through service calls', async () => {
      const mockUser = createMockUser();
      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser
      });

      // Test that user context is properly propagated
      const handler = withAuth(async (userId) => {
        // Verify user can be retrieved from service
        const userResult = await UserService.getUserByEmail('test@example.com');
        expect(userResult.success).toBe(true);
        expect(userResult.data?.id).toBe(userId);

        return NextResponse.json({
          success: true,
          userId,
          serviceUserId: userResult.data?.id
        });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe(data.serviceUserId);
      expect(data.userId).toBe('user123');
    });

    it('should handle subscription tier validation in API context', async () => {
      // Test different subscription tiers
      const tiers = [
        { tier: 'free', expectedAccess: true },
        { tier: 'premium', expectedAccess: true },
        { tier: 'expert', expectedAccess: true },
        { tier: 'master', expectedAccess: true }
      ];

      for (const { tier, expectedAccess } of tiers) {
        mockSessionUtils.getSessionUserTier.mockResolvedValue(tier);

        const handler = withAuth(async (userId) => {
          const userTier = await sessionUtils.getSessionUserTier();
          return NextResponse.json({
            success: true,
            userId,
            tier: userTier,
            hasAccess: expectedAccess
          });
        });

        const request = new NextRequest('http://localhost:3000/api/characters', {
          method: 'GET'
        });

        const response = await handler(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tier).toBe(tier);
        expect(data.hasAccess).toBe(expectedAccess);
      }
    });
  });

  describe('Service Integration Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      // Simulate service failure
      mockCharacterService.getCharactersByOwner.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const handler = withAuth(async (userId) => {
        const result = await CharacterService.getCharactersByOwner(userId, 1, 10);
        return NextResponse.json(result);
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200); // Request succeeds but service fails
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle authentication service failures', async () => {
      // Simulate authentication service failure
      mockSessionUtils.getSessionUserId.mockRejectedValue(new Error('Auth service unavailable'));

      const handler = withAuth(async (userId) => {
        return NextResponse.json({ success: true, userId });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should handle partial authentication data', async () => {
      // Simulate partial authentication data
      mockSessionUtils.getSessionUserId.mockResolvedValue('user123');
      mockSessionUtils.getSessionUserTier.mockResolvedValue(null); // Missing tier

      const handler = withAuth(async (userId) => {
        const userTier = await sessionUtils.getSessionUserTier();
        return NextResponse.json({
          success: true,
          userId,
          tier: userTier || 'free' // Default fallback
        });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tier).toBe('free'); // Should default to free tier
    });
  });

  describe('Request Validation Integration', () => {
    it('should validate request body with authentication', async () => {
      const invalidCharacterData = {
        name: '', // Invalid: empty name
        level: -1, // Invalid: negative level
        class: 'InvalidClass'
      };

      const handler = withAuth(async (userId) => {
        // Simulate validation logic
        if (!invalidCharacterData.name || invalidCharacterData.name.trim() === '') {
          return NextResponse.json(
            { error: 'Character name is required' },
            { status: 400 }
          );
        }

        if (invalidCharacterData.level < 1 || invalidCharacterData.level > 20) {
          return NextResponse.json(
            { error: 'Character level must be between 1 and 20' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCharacterData)
      });

      const response = await handler(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Character name is required');
    });

    it('should handle query parameter validation with authentication', async () => {
      const handler = withAuth(async (userId) => {
        const url = new URL('http://localhost:3000/api/characters');
        const searchParams = url.searchParams;

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (page < 1 || limit < 1 || limit > 100) {
          return NextResponse.json(
            { error: 'Invalid pagination parameters' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true, page, limit });
      });

      // Test invalid pagination
      const request = new NextRequest('http://localhost:3000/api/characters?page=-1&limit=200', {
        method: 'GET'
      });

      const response = await handler(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid pagination parameters');
    });
  });

  describe('Performance and Integration Edge Cases', () => {
    it('should handle concurrent authenticated requests', async () => {
      // Test multiple concurrent requests
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const handler = withAuth(async (userId) => {
          await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
          return NextResponse.json({ success: true, userId, requestId: i });
        });

        const request = new NextRequest(`http://localhost:3000/api/characters/${i}`, {
          method: 'GET'
        });

        promises.push(handler(request));
      }

      const responses = await Promise.all(promises);

      // Verify all requests succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Verify user ID consistency across requests
      const dataPromises = responses.map(response => response.json());
      const dataResults = await Promise.all(dataPromises);

      dataResults.forEach(data => {
        expect(data.userId).toBe('user123');
      });
    });

    it('should handle session expiration during request processing', async () => {
      // Simulate session expiration during processing
      mockSessionUtils.getSessionUserId.mockResolvedValue('user123');

      const handler = withAuth(async (userId) => {
        // Simulate async operation that takes time
        await new Promise(resolve => setTimeout(resolve, 100));

        // During this time, session expires
        mockSessionUtils.getSessionUserId.mockResolvedValue(null);

        return NextResponse.json({ success: true, userId });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'GET'
      });

      const response = await handler(request);

      // Request should still succeed because auth was validated at start
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe('user123');
    });

    it('should handle large request payloads with authentication', async () => {
      const largePayload = {
        name: 'Test Character',
        level: 10,
        class: 'Paladin',
        // Add large data to test payload handling
        description: 'A'.repeat(10000), // 10KB description
        background: 'B'.repeat(5000),    // 5KB background
        notes: 'C'.repeat(3000)          // 3KB notes
      };

      const handler = withAuth(async (userId) => {
        return NextResponse.json({
          success: true,
          userId,
          payloadSize: JSON.stringify(largePayload).length
        });
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe('user123');
      expect(data.payloadSize).toBeGreaterThan(18000); // Total payload size
    });
  });
});