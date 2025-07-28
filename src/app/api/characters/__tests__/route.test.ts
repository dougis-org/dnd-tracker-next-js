import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '../route';
import { CharacterService } from '@/lib/services/CharacterService';

// Mock dependencies
jest.mock('@/lib/services/CharacterService');

// Import test helpers - they handle auth mocking
import {
  expectSuccessResponse,
  expectAuthError,
  expectValidationError,
  testApiRouteAuth,
  testApiRouteUnauth,
  TEST_USERS,
  resetAuthMocks,
} from '@/__tests__/auth-session-test-helpers';

// Since we're using the centralized test helpers, we don't need local helpers

const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

describe('/api/characters API Route', () => {
  const testUserId = 'free-user-123';

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

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMocks();
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

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        undefined,
        'GET',
        '/api/characters?search=Test'
      );

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

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        undefined,
        'GET',
        '/api/characters?type=pc'
      );

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

      const { response, data } = await testApiRouteAuth(
        POST,
        TEST_USERS.FREE_USER,
        validCharacterData,
        undefined,
        'POST'
      );

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Test Character');
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        testUserId,
        validCharacterData
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(
        POST,
        validCharacterData,
        undefined,
        'POST'
      );
      expectAuthError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validCharacterData, name: '' };

      const { response } = await testApiRouteAuth(
        POST,
        TEST_USERS.FREE_USER,
        invalidData,
        undefined,
        'POST'
      );
      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.createCharacter.mockRejectedValue(
        new Error('Failed to create character')
      );

      const { response, data } = await testApiRouteAuth(
        POST,
        TEST_USERS.FREE_USER,
        validCharacterData,
        undefined,
        'POST'
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create character');
    });
  });
});