import { describe, it, expect } from '@jest/globals';

// Mock auth module FIRST - this must be before any imports that use it
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/lib/services/CharacterService');

// Import everything after mocks are set up
import { GET, PUT, DELETE } from '../route';
import { CharacterService } from '@/lib/services/CharacterService';
import { getServerSession } from '@/lib/auth/server-session';
import {
  TEST_USERS,
  testAuthenticatedRoute,
  testUnauthenticatedRoute,
  expectSuccessResponse,
  expectAuthenticationError,
  expectValidationError,
  expectSuccessData,
  expectErrorData,
  setupApiRouteTests,
} from '@/__tests__/auth-session-test-helpers';

// Get the mocked function from the module
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

describe('/api/characters/[id] API Route', () => {
  setupApiRouteTests();

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

  const validUpdateData = {
    name: 'Updated Character',
    hitPoints: { max: 30, current: 25 },
    armorClass: 18,
  };

  describe('GET /api/characters/[id]', () => {
    it('should return character for authenticated owner', async () => {
      mockCharacterService.getCharacterById.mockResolvedValue({
        success: true,
        data: mockCharacter
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.name).toBe('Test Character');
      expect(mockCharacterService.getCharacterById).toHaveBeenCalledWith(testCharacterId, testUserId);
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(GET, {
        params: { id: testCharacterId }
      });
      expectAuthenticationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.getCharacterById.mockResolvedValue({
        success: false,
        error: { message: 'Character not found' }
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });

  describe('PUT /api/characters/[id]', () => {
    it('should update character successfully', async () => {
      const updatedCharacter = { ...mockCharacter, ...validUpdateData };
      mockCharacterService.updateCharacter.mockResolvedValue({
        success: true,
        data: updatedCharacter
      });

      const { response, data } = await testAuthenticatedRoute(PUT, {
        method: 'PUT',
        body: validUpdateData,
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.name).toBe('Updated Character');
      expect(mockCharacterService.updateCharacter).toHaveBeenCalledWith(
        testCharacterId,
        testUserId,
        validUpdateData
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(PUT, {
        method: 'PUT',
        body: validUpdateData,
        params: { id: testCharacterId }
      });
      expectAuthenticationError(response);
    });

    it('should validate request body', async () => {
      const invalidData = { invalidField: 'invalid' };

      const { response } = await testAuthenticatedRoute(PUT, {
        method: 'PUT',
        body: invalidData,
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.updateCharacter.mockResolvedValue({
        success: false,
        error: { message: 'Update failed' }
      });

      const { response, data } = await testAuthenticatedRoute(PUT, {
        method: 'PUT',
        body: validUpdateData,
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });

  describe('DELETE /api/characters/[id]', () => {
    it('should delete character successfully', async () => {
      mockCharacterService.deleteCharacter.mockResolvedValue({
        success: true,
        data: null
      });

      const { response, data } = await testAuthenticatedRoute(DELETE, {
        method: 'DELETE',
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(mockCharacterService.deleteCharacter).toHaveBeenCalledWith(testCharacterId, testUserId);
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(DELETE, {
        method: 'DELETE',
        params: { id: testCharacterId }
      });
      expectAuthenticationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.deleteCharacter.mockResolvedValue({
        success: false,
        error: { message: 'Delete failed' }
      });

      const { response, data } = await testAuthenticatedRoute(DELETE, {
        method: 'DELETE',
        user: TEST_USERS.FREE_USER,
        params: { id: testCharacterId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });
});