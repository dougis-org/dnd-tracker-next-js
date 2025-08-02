/**
 * Comprehensive Character Service Tests
 *
 * Tests for the main CharacterService facade and integration points
 */

// Mock mongoose first
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation(() => ({})),
  model: jest.fn().mockReturnValue({}),
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => ({ toString: () => id })),
    ObjectId: {
      isValid: jest.fn(() => true),
    },
  },
}));

// Mock the Character model
jest.mock('../../models/Character', () => ({
  Character: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

import { CharacterService } from '../CharacterService';
import { CHARACTER_ERROR_CODES } from '../CharacterServiceErrors';
import { createMockCharacterData } from './CharacterService.test-helpers';

// Mock all the sub-services
jest.mock('../CharacterServiceCRUD', () => ({
  CharacterServiceCRUD: {
    createCharacter: jest.fn(),
    getCharacterById: jest.fn(),
    updateCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
  },
}));

jest.mock('../CharacterServiceSearch', () => ({
  CharacterServiceSearch: {
    getCharactersByOwner: jest.fn(),
    searchCharacters: jest.fn(),
    getCharactersByClass: jest.fn(),
    getCharactersByRace: jest.fn(),
    getCharactersByType: jest.fn(),
    getPublicCharacters: jest.fn(),
  },
}));

jest.mock('../CharacterServiceStats', () => ({
  CharacterServiceStats: {
    calculateCharacterStats: jest.fn(),
    getCharacterSummary: jest.fn(),
    calculateSpellcastingStats: jest.fn(),
    calculateCarryingCapacity: jest.fn(),
    calculateEquipmentWeight: jest.fn(),
    calculateExperienceInfo: jest.fn(),
  },
}));

jest.mock('../CharacterServiceTemplates', () => ({
  CharacterServiceTemplates: {
    createCharacterTemplate: jest.fn(),
    cloneCharacter: jest.fn(),
    createCharacterFromTemplate: jest.fn(),
    createMultipleCharacters: jest.fn(),
    updateMultipleCharacters: jest.fn(),
    deleteMultipleCharacters: jest.fn(),
  },
}));

// Mock utility modules
jest.mock('../utils/CharacterValidationUtils', () => ({
  CharacterValidationUtils: {
    validateCharacterData: jest.fn(),
  },
}));

jest.mock('../utils/CharacterAccessUtils', () => ({
  CharacterAccessUtils: {
    checkOwnership: jest.fn(),
    checkAccess: jest.fn(),
    getPermissions: jest.fn(),
  },
}));

describe('CharacterService Facade', () => {
  const validUserId = '507f1f77bcf86cd799439012';
  const validCharacterId = '507f1f77bcf86cd799439011';
  const mockCharacterData = createMockCharacterData();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should delegate createCharacter to CRUD service', async () => {
      const { CharacterServiceCRUD } = require('../CharacterServiceCRUD');
      CharacterServiceCRUD.createCharacter.mockResolvedValue({
        success: true,
        data: { _id: validCharacterId, ...mockCharacterData },
      });

      const result = await CharacterService.createCharacter(validUserId, mockCharacterData);
      expect(result.success).toBe(true);
      expect(CharacterServiceCRUD.createCharacter).toHaveBeenCalledWith(validUserId, mockCharacterData);
    });

    it('should delegate getCharacterById to CRUD service', async () => {
      const { CharacterServiceCRUD } = require('../CharacterServiceCRUD');
      CharacterServiceCRUD.getCharacterById.mockResolvedValue({
        success: true,
        data: { _id: validCharacterId, ...mockCharacterData },
      });

      const result = await CharacterService.getCharacterById(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceCRUD.getCharacterById).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate updateCharacter to CRUD service', async () => {
      const { CharacterServiceCRUD } = require('../CharacterServiceCRUD');
      CharacterServiceCRUD.updateCharacter.mockResolvedValue({
        success: true,
        data: { _id: validCharacterId, name: 'Updated' },
      });

      const result = await CharacterService.updateCharacter(validCharacterId, validUserId, { name: 'Updated' });
      expect(result.success).toBe(true);
      expect(CharacterServiceCRUD.updateCharacter).toHaveBeenCalledWith(validCharacterId, validUserId, { name: 'Updated' });
    });

    it('should delegate deleteCharacter to CRUD service', async () => {
      const { CharacterServiceCRUD } = require('../CharacterServiceCRUD');
      CharacterServiceCRUD.deleteCharacter.mockResolvedValue({ success: true, data: undefined });

      const result = await CharacterService.deleteCharacter(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceCRUD.deleteCharacter).toHaveBeenCalledWith(validCharacterId, validUserId);
    });
  });

  describe('Search Operations', () => {
    it('should delegate getCharactersByOwner to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.getCharactersByOwner.mockResolvedValue({
        success: true,
        data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      });

      const result = await CharacterService.getCharactersByOwner(validUserId, 1, 20);
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.getCharactersByOwner).toHaveBeenCalledWith(validUserId, 1, 20);
    });

    it('should delegate searchCharacters to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.searchCharacters.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await CharacterService.searchCharacters('gandalf', validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.searchCharacters).toHaveBeenCalledWith('gandalf', validUserId);
    });

    it('should delegate getCharactersByClass to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.getCharactersByClass.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await CharacterService.getCharactersByClass('wizard', validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.getCharactersByClass).toHaveBeenCalledWith('wizard', validUserId);
    });

    it('should delegate getCharactersByRace to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.getCharactersByRace.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await CharacterService.getCharactersByRace('elf', validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.getCharactersByRace).toHaveBeenCalledWith('elf', validUserId);
    });

    it('should delegate getCharactersByType to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.getCharactersByType.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await CharacterService.getCharactersByType('pc', validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.getCharactersByType).toHaveBeenCalledWith('pc', validUserId);
    });

    it('should delegate getPublicCharacters to Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.getPublicCharacters.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await CharacterService.getPublicCharacters();
      expect(result.success).toBe(true);
      expect(CharacterServiceSearch.getPublicCharacters).toHaveBeenCalled();
    });
  });

  describe('Statistics and Calculations', () => {
    it('should delegate calculateCharacterStats to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateCharacterStats.mockResolvedValue({
        success: true,
        data: { abilityModifiers: {} },
      });

      const result = await CharacterService.calculateCharacterStats(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.calculateCharacterStats).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate getCharacterSummary to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.getCharacterSummary.mockResolvedValue({
        success: true,
        data: { name: 'Test Character' },
      });

      const result = await CharacterService.getCharacterSummary(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.getCharacterSummary).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate calculateSpellcastingStats to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateSpellcastingStats.mockResolvedValue({
        success: true,
        data: { casterLevel: 0 },
      });

      const result = await CharacterService.calculateSpellcastingStats(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.calculateSpellcastingStats).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate calculateCarryingCapacity to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateCarryingCapacity.mockResolvedValue({
        success: true,
        data: { maximum: 240 },
      });

      const result = await CharacterService.calculateCarryingCapacity(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.calculateCarryingCapacity).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate calculateEquipmentWeight to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateEquipmentWeight.mockResolvedValue({
        success: true,
        data: { total: 55 },
      });

      const result = await CharacterService.calculateEquipmentWeight(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.calculateEquipmentWeight).toHaveBeenCalledWith(validCharacterId, validUserId);
    });

    it('should delegate calculateExperienceInfo to Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateExperienceInfo.mockResolvedValue({
        success: true,
        data: { currentLevel: 1 },
      });

      const result = await CharacterService.calculateExperienceInfo(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(CharacterServiceStats.calculateExperienceInfo).toHaveBeenCalledWith(validCharacterId, validUserId);
    });
  });

  describe('Templates and Bulk Operations', () => {
    it('should delegate createCharacterTemplate to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.createCharacterTemplate.mockResolvedValue({
        success: true,
        data: { name: 'Template' },
      });

      const result = await CharacterService.createCharacterTemplate(validCharacterId, validUserId, 'Template');
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.createCharacterTemplate).toHaveBeenCalledWith(validCharacterId, validUserId, 'Template');
    });

    it('should delegate cloneCharacter to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.cloneCharacter.mockResolvedValue({
        success: true,
        data: { name: 'Clone' },
      });

      const result = await CharacterService.cloneCharacter(validCharacterId, validUserId, 'Clone');
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.cloneCharacter).toHaveBeenCalledWith(validCharacterId, validUserId, 'Clone');
    });

    it('should delegate createCharacterFromTemplate to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.createCharacterFromTemplate.mockResolvedValue({
        success: true,
        data: { name: 'From Template' },
      });

      const templateData = { name: 'Template', type: 'pc' as const };
      const customizations = { name: 'Custom Name' };
      const result = await CharacterService.createCharacterFromTemplate(templateData, validUserId, customizations);
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.createCharacterFromTemplate).toHaveBeenCalledWith(templateData, validUserId, customizations);
    });

    it('should delegate createMultipleCharacters to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.createMultipleCharacters.mockResolvedValue({
        success: true,
        data: { successful: [], failed: [] },
      });

      const charactersData = [mockCharacterData];
      const result = await CharacterService.createMultipleCharacters(validUserId, charactersData);
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.createMultipleCharacters).toHaveBeenCalledWith(validUserId, charactersData);
    });

    it('should delegate updateMultipleCharacters to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.updateMultipleCharacters.mockResolvedValue({
        success: true,
        data: [],
      });

      const updates = [{ characterId: validCharacterId, data: { name: 'Updated' } }];
      const result = await CharacterService.updateMultipleCharacters(validUserId, updates);
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.updateMultipleCharacters).toHaveBeenCalledWith(validUserId, updates);
    });

    it('should delegate deleteMultipleCharacters to Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.deleteMultipleCharacters.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const characterIds = [validCharacterId];
      const result = await CharacterService.deleteMultipleCharacters(validUserId, characterIds);
      expect(result.success).toBe(true);
      expect(CharacterServiceTemplates.deleteMultipleCharacters).toHaveBeenCalledWith(validUserId, characterIds);
    });
  });

  describe('Validation and Permissions', () => {
    it('should validate character data with schema validation', async () => {
      const result = await CharacterService.validateCharacterData(mockCharacterData);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe(mockCharacterData.name);
    });

    it('should check character ownership with direct implementation', async () => {
      const { CharacterAccessUtils } = require('../utils/CharacterAccessUtils');
      CharacterAccessUtils.checkOwnership.mockResolvedValue({
        success: true,
        data: {
          _id: validCharacterId,
          ownerId: { toString: () => validUserId },
        },
      });

      const result = await CharacterService.checkCharacterOwnership(validCharacterId, validUserId);
      expect(result.success).toBe(true);
    });

    it('should check character access with direct implementation', async () => {
      const { CharacterAccessUtils } = require('../utils/CharacterAccessUtils');
      CharacterAccessUtils.checkAccess.mockResolvedValue({
        success: true,
        data: {
          _id: validCharacterId,
          ownerId: { toString: () => validUserId },
          isPublic: false,
        },
      });

      const result = await CharacterService.checkCharacterAccess(validCharacterId, validUserId);
      expect(result.success).toBe(true);
    });

    it('should get character permissions with direct implementation', async () => {
      const { Character } = require('../../models/Character');
      Character.findById.mockResolvedValue({
        _id: validCharacterId,
        ownerId: { toString: () => validUserId },
        isPublic: false,
      });

      const result = await CharacterService.getCharacterPermissions(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from CRUD service', async () => {
      const { CharacterServiceCRUD } = require('../CharacterServiceCRUD');
      CharacterServiceCRUD.createCharacter.mockResolvedValue({
        success: false,
        error: { code: CHARACTER_ERROR_CODES.INVALID_CHARACTER_DATA, message: 'Invalid data' },
      });

      const result = await CharacterService.createCharacter(validUserId, mockCharacterData);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_CHARACTER_DATA);
    });

    it('should propagate errors from Search service', async () => {
      const { CharacterServiceSearch } = require('../CharacterServiceSearch');
      CharacterServiceSearch.searchCharacters.mockResolvedValue({
        success: false,
        error: { code: CHARACTER_ERROR_CODES.INVALID_SEARCH_CRITERIA, message: 'Invalid search' },
      });

      const result = await CharacterService.searchCharacters('', validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_SEARCH_CRITERIA);
    });

    it('should propagate errors from Stats service', async () => {
      const { CharacterServiceStats } = require('../CharacterServiceStats');
      CharacterServiceStats.calculateCharacterStats.mockResolvedValue({
        success: false,
        error: { code: CHARACTER_ERROR_CODES.CHARACTER_NOT_FOUND, message: 'Character not found' },
      });

      const result = await CharacterService.calculateCharacterStats(validCharacterId, validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.CHARACTER_NOT_FOUND);
    });

    it('should propagate errors from Templates service', async () => {
      const { CharacterServiceTemplates } = require('../CharacterServiceTemplates');
      CharacterServiceTemplates.cloneCharacter.mockResolvedValue({
        success: false,
        error: { code: CHARACTER_ERROR_CODES.UNAUTHORIZED_ACCESS, message: 'Authentication required' },
      });

      const result = await CharacterService.cloneCharacter(validCharacterId, validUserId, 'Clone');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.UNAUTHORIZED_ACCESS);
    });
  });
});