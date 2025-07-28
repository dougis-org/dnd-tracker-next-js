import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '../route';
import { CharacterService } from '@/lib/services/CharacterService';
import {
  createRequestWithAuth,
  createUnauthenticatedRequest,
  createTestContext,
  expectSuccessResponse,
  expectAuthError,
  expectValidationError,
  testApiRouteAuth,
  testApiRouteUnauth,
  setupAuthTestEnvironment,
  TEST_USERS,
} from '@/__tests__/auth-session-test-helpers';

// Mock dependencies
jest.mock('@/lib/services/CharacterService');

const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

describe('/api/characters API Route', () => {
  const testUserId = TEST_USERS.FREE_USER.userId;

  const mockCharacter = {
    _id: 'character-123',
    name: 'Test Character',
    ownerId: testUserId,
    type: 'pc' as const,
    abilityScores: {
      strength: 10,
      dexterity: 12,
      constitution: 14,
      intelligence: 13,
      wisdom: 15,
      charisma: 8,
    },
    hitPoints: { max: 25, current: 25 },
    armorClass: 16,
  };

  const mockApiResponses = {
    success: (data: any, pagination?: any) => ({
      success: true,
      data: pagination ? { items: data, pagination } : data
    }),
    error: (message: string) => ({ success: false, error: { message } }),
  };

  setupAuthTestEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/characters', () => {
    it('should return characters for authenticated user', async () => {
      const mockPagination = {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      };

      mockCharacterService.getCharactersByOwner.mockResolvedValue(
        mockApiResponses.success([mockCharacter], mockPagination)
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test Character');
      expect(mockCharacterService.getCharactersByOwner).toHaveBeenCalledWith(
        testUserId,
        1,
        50
      );
    });

    it('should handle search parameter', async () => {
      mockCharacterService.searchCharacters.mockResolvedValue(
        mockApiResponses.success([mockCharacter])
      );

      const request = createRequestWithAuth(
        '/api/characters?search=Test',
        'GET',
        undefined,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext();

      const response = await GET(request, context);
      const data = await response.json();

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(mockCharacterService.searchCharacters).toHaveBeenCalledWith(
        'Test',
        testUserId
      );
    });

    it('should handle type parameter', async () => {
      mockCharacterService.getCharactersByType.mockResolvedValue(
        mockApiResponses.success([mockCharacter])
      );

      const request = createRequestWithAuth(
        '/api/characters?type=pc',
        'GET',
        undefined,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext();

      const response = await GET(request, context);
      const data = await response.json();

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(mockCharacterService.getCharactersByType).toHaveBeenCalledWith(
        'pc',
        testUserId
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(GET);
      expectAuthError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.getCharactersByOwner.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('POST /api/characters', () => {
    const validCharacterData = {
      name: 'New Test Character',
      type: 'pc' as const,
      abilityScores: {
        strength: 10,
        dexterity: 12,
        constitution: 14,
        intelligence: 13,
        wisdom: 15,
        charisma: 8,
      },
      hitPoints: { max: 25 },
      armorClass: 16,
    };

    it('should create character successfully', async () => {
      const createdCharacter = { ...mockCharacter, ...validCharacterData };
      mockCharacterService.createCharacter.mockResolvedValue(
        mockApiResponses.success(createdCharacter)
      );

      const request = createRequestWithAuth(
        '/api/characters',
        'POST',
        validCharacterData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Test Character');
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        testUserId,
        validCharacterData
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const request = createUnauthenticatedRequest(
        '/api/characters',
        'POST',
        validCharacterData
      );
      const context = createTestContext();

      const response = await POST(request, context);
      expectAuthError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validCharacterData, name: '' };

      const request = createRequestWithAuth(
        '/api/characters',
        'POST',
        invalidData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext();

      const response = await POST(request, context);
      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.createCharacter.mockRejectedValue(
        new Error('Failed to create character')
      );

      const request = createRequestWithAuth(
        '/api/characters',
        'POST',
        validCharacterData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext();

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create character');
    });
  });
});