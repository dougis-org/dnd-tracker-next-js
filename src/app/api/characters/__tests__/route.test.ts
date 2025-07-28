import { describe, it, expect } from '@jest/globals';

// Mock auth module FIRST - this must be before any imports that use it
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/lib/services/CharacterService');

// Import everything after mocks are set up
import { GET, POST } from '../route';
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

describe('/api/characters API Route', () => {
  setupApiRouteTests();

  const mockCharacter = {
    _id: 'character-123',
    name: 'Test Character',
    ownerId: 'free-user-123',
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

  const validCharacterData = {
    name: 'New Test Character',
    type: 'pc' as const,
    abilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
    hitPoints: { max: 25 },
    armorClass: 16,
  };

  describe('GET /api/characters', () => {
    it('should return characters for authenticated user', async () => {
      const mockPagination = {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      };

      mockCharacterService.getCharactersByOwner.mockResolvedValue({
        success: true,
        data: { items: [mockCharacter], pagination: mockPagination }
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test Character');
      expect(mockCharacterService.getCharactersByOwner).toHaveBeenCalledWith(
        'free-user-123',
        1,
        50
      );
    });

    it('should handle search parameter', async () => {
      mockCharacterService.searchCharacters.mockResolvedValue({
        success: true,
        data: [mockCharacter]
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        url: '/api/characters?search=Test',
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(mockCharacterService.searchCharacters).toHaveBeenCalledWith(
        'Test',
        'free-user-123'
      );
    });

    it('should handle type parameter', async () => {
      mockCharacterService.getCharactersByType.mockResolvedValue({
        success: true,
        data: [mockCharacter]
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        url: '/api/characters?type=pc',
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(mockCharacterService.getCharactersByType).toHaveBeenCalledWith(
        'pc',
        'free-user-123'
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(GET);
      expectAuthenticationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.getCharactersByOwner.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed' }
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER
      });

      expect(response.status).toBe(500);
      expectErrorData(data, 'Failed to get characters');
    });
  });

  describe('POST /api/characters', () => {
    it('should create character successfully', async () => {
      const createdCharacter = { ...mockCharacter, ...validCharacterData };
      mockCharacterService.createCharacter.mockResolvedValue({
        success: true,
        data: createdCharacter
      });

      const { response, data } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: validCharacterData,
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response, 201);
      expectSuccessData(data);
      expect(data.data.name).toBe('New Test Character');
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        'free-user-123',
        validCharacterData
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(POST, {
        method: 'POST',
        body: validCharacterData
      });
      expectAuthenticationError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validCharacterData, name: '' };

      const { response } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: invalidData,
        user: TEST_USERS.FREE_USER
      });

      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockCharacterService.createCharacter.mockResolvedValue({
        success: false,
        error: { message: 'Failed to create character' }
      });

      const { response, data } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: validCharacterData,
        user: TEST_USERS.FREE_USER
      });

      expect(response.status).toBe(500);
      expectErrorData(data, 'Failed to create character');
    });
  });
});