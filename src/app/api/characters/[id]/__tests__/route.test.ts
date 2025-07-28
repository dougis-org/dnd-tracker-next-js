import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, PUT, DELETE } from '../route';
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

describe('/api/characters/[id] API Route', () => {
  const testUserId = TEST_USERS.FREE_USER.userId;
  const testCharacterId = 'character-123';

  const mockCharacter = {
    _id: testCharacterId,
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
    success: (data?: any) => ({ success: true, data }),
    error: (message: string) => ({ success: false, error: { message } }),
  };

  setupAuthTestEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/characters/[id]', () => {
    it('should return character when found', async () => {
      mockCharacterService.getCharacterById.mockResolvedValue(
        mockApiResponses.success(mockCharacter)
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Character');
      expect(mockCharacterService.getCharacterById).toHaveBeenCalledWith(
        testCharacterId,
        testUserId
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(
        GET,
        undefined,
        { id: testCharacterId }
      );

      expectAuthError(response);
    });

    it('should handle character not found', async () => {
      mockCharacterService.getCharacterById.mockResolvedValue(
        mockApiResponses.error('Character not found')
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expect(response.status).toBe(500); // Service error becomes 500
      expect(data.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.getCharacterById.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('PUT /api/characters/[id]', () => {
    const validUpdateData = {
      name: 'Updated Character',
      hitPoints: { max: 30, current: 25 },
      armorClass: 18,
    };

    it('should update character successfully', async () => {
      const updatedCharacter = { ...mockCharacter, ...validUpdateData };
      mockCharacterService.updateCharacter.mockResolvedValue(
        mockApiResponses.success(updatedCharacter)
      );

      const request = createRequestWithAuth(
        `/api/characters/${testCharacterId}`,
        'PUT',
        validUpdateData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testCharacterId });

      const response = await PUT(request, context);
      const data = await response.json();

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Character');
      expect(mockCharacterService.updateCharacter).toHaveBeenCalledWith(
        testCharacterId,
        validUpdateData,
        testUserId
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const request = createUnauthenticatedRequest(
        `/api/characters/${testCharacterId}`,
        'PUT',
        validUpdateData
      );
      const context = createTestContext({ id: testCharacterId });

      const response = await PUT(request, context);
      expectAuthError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validUpdateData, name: '' };

      const request = createRequestWithAuth(
        `/api/characters/${testCharacterId}`,
        'PUT',
        invalidData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testCharacterId });

      const response = await PUT(request, context);
      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.updateCharacter.mockRejectedValue(
        new Error('Failed to update character')
      );

      const request = createRequestWithAuth(
        `/api/characters/${testCharacterId}`,
        'PUT',
        validUpdateData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testCharacterId });

      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to update character');
    });
  });

  describe('DELETE /api/characters/[id]', () => {
    it('should delete character successfully', async () => {
      mockCharacterService.deleteCharacter.mockResolvedValue(
        mockApiResponses.success()
      );

      const { response, data } = await testApiRouteAuth(
        DELETE,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(mockCharacterService.deleteCharacter).toHaveBeenCalledWith(
        testCharacterId,
        testUserId
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(
        DELETE,
        undefined,
        { id: testCharacterId }
      );

      expectAuthError(response);
    });

    it('should handle character not found', async () => {
      mockCharacterService.deleteCharacter.mockResolvedValue(
        mockApiResponses.error('Character not found')
      );

      const { response, data } = await testApiRouteAuth(
        DELETE,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expect(response.status).toBe(500); // Service error becomes 500
      expect(data.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.deleteCharacter.mockRejectedValue(
        new Error('Failed to delete character')
      );

      const { response, data } = await testApiRouteAuth(
        DELETE,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testCharacterId }
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to delete character');
    });
  });
});