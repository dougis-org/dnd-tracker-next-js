import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '../route';
import {
  TEST_USER_ID,
  createCharacterData,
} from './test-helpers';
import {
  mockCharacterService,
  setupSuccessfulGetCharacters,
  setupSuccessfulCharacterCreate,
  createAuthenticatedRequest,
  createCharacterListRequest,
  createTestCharacters,
  expectSuccessfulResponse,
  expectSuccessfulCreation,
  runAuthenticationTest,
} from './shared-test-utils';

// Mock dependencies
jest.mock('@/lib/services/CharacterService');
jest.mock('@/lib/db');

// Mock NextAuth for future compatibility
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Get the mocked auth function
const { auth } = require('@/lib/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/characters API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/characters', () => {
    it('should return characters for authenticated user', async () => {
      // Arrange
      const characters = createTestCharacters();
      setupSuccessfulGetCharacters(characters);
      const request = createCharacterListRequest();

      // Act
      const response = await GET(request);
      const data = await expectSuccessfulResponse(response);

      // Assert
      expect(data.data).toHaveLength(2);
      expect(data.data.map((c: any) => c.name)).toEqual(
        expect.arrayContaining(['Test Character 1', 'Test Character 2'])
      );
      expect(mockCharacterService.getCharactersByOwner).toHaveBeenCalledWith(
        TEST_USER_ID, 1, 50
      );
    });

    it('should return empty array for user with no characters', async () => {
      // Arrange
      setupSuccessfulGetCharacters([]);
      const request = createCharacterListRequest();

      // Act
      const response = await GET(request);
      const data = await expectSuccessfulResponse(response);

      // Assert
      expect(data.data).toHaveLength(0);
    });

    it('should return 401 when user is not authenticated', async () => {
      await runAuthenticationTest(GET, mockAuth);
    });

    it('should filter characters by type when specified', async () => {
      // Arrange
      const pcCharacters = [{ name: 'PC Character', type: 'pc' }];
      mockCharacterService.getCharactersByType.mockResolvedValue({
        success: true,
        data: pcCharacters
      });
      const request = createCharacterListRequest('?type=pc');

      // Act
      const response = await GET(request);
      const data = await expectSuccessfulResponse(response);

      // Assert
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('PC Character');
      expect(data.data[0].type).toBe('pc');
      expect(mockCharacterService.getCharactersByType).toHaveBeenCalledWith(
        'pc', TEST_USER_ID
      );
    });
  });

  describe('POST /api/characters', () => {
    it('should create a new character', async () => {
      // Arrange
      const characterData = createCharacterData();
      setupSuccessfulCharacterCreate(characterData);
      const request = createAuthenticatedRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: characterData
      });

      // Act
      const response = await POST(request);
      const data = await expectSuccessfulCreation(response);

      // Assert
      expect(data.data.name).toBe(characterData.name);
      expect(data.data.race).toBe(characterData.race);
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining(characterData)
      );
    });

    it('should return 400 for invalid character data', async () => {
      // Arrange
      const invalidCharacterData = {
        name: '', // Invalid: empty name
        type: 'INVALID_TYPE' // Invalid: not a valid CharacterType
      };

      const request = createAuthenticatedRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: invalidCharacterData
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 401 when user is not authenticated', async () => {
      await runAuthenticationTest(POST, mockAuth);
    });
  });
});