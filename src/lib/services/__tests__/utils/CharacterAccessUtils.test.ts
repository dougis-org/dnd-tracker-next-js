/**
 * Character Access Utils Tests
 */

import { CharacterAccessUtils } from '../../utils/CharacterAccessUtils';
import { CHARACTER_ERROR_CODES } from '../../CharacterServiceErrors';

// Mock the Character model
jest.mock('../../../models/Character', () => ({
  Character: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => ({ toString: () => id })),
    isValid: jest.fn(),
  },
  Schema: {
    Types: {
      ObjectId: jest.fn()
    }
  }
}));

describe('CharacterAccessUtils', () => {
  const validCharacterId = '507f1f77bcf86cd799439011';
  const validUserId = '507f1f77bcf86cd799439012';
  const differentUserId = '507f1f77bcf86cd799439013';

  const mockCharacter = {
    _id: validCharacterId,
    ownerId: { toString: () => validUserId },
    isPublic: false,
    name: 'Test Character',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkOwnership', () => {
    it('should return character for valid owner', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(mockCharacter);

      const result = await CharacterAccessUtils.checkOwnership(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharacter);
    });

    it('should fail when character not found', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(null);

      const result = await CharacterAccessUtils.checkOwnership(validCharacterId, validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.CHARACTER_NOT_FOUND);
    });

    it('should fail for non-owner', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(mockCharacter);

      const result = await CharacterAccessUtils.checkOwnership(validCharacterId, differentUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.UNAUTHORIZED_ACCESS);
    });

    it('should handle database errors', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockRejectedValue(new Error('Database error'));

      const result = await CharacterAccessUtils.checkOwnership(validCharacterId, validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.DATABASE_ERROR);
    });
  });

  describe('checkAccess', () => {
    it('should allow access for owner', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(mockCharacter);

      const result = await CharacterAccessUtils.checkAccess(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharacter);
    });

    it('should allow access for public character', async () => {
      const { Character } = require('../../../models/Character');
      const publicCharacter = { ...mockCharacter, isPublic: true };
      Character.findById.mockResolvedValue(publicCharacter);

      const result = await CharacterAccessUtils.checkAccess(validCharacterId, differentUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(publicCharacter);
    });

    it('should deny access for private character and non-owner', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(mockCharacter);

      const result = await CharacterAccessUtils.checkAccess(validCharacterId, differentUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.UNAUTHORIZED_ACCESS);
    });

    it('should fail when character not found', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(null);

      const result = await CharacterAccessUtils.checkAccess(validCharacterId, validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.CHARACTER_NOT_FOUND);
    });
  });

  describe('getPermissions', () => {
    it('should return full permissions for owner', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(mockCharacter);

      const result = await CharacterAccessUtils.getPermissions(validCharacterId, validUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        canView: true,
        canEdit: true,
        canDelete: true,
        isOwner: true,
        isPublic: false,
      });
    });

    it('should return limited permissions for public character non-owner', async () => {
      const { Character } = require('../../../models/Character');
      const publicCharacter = { ...mockCharacter, isPublic: true };
      Character.findById.mockResolvedValue(publicCharacter);

      const result = await CharacterAccessUtils.getPermissions(validCharacterId, differentUserId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        canView: true,
        canEdit: false,
        canDelete: false,
        isOwner: false,
        isPublic: true,
      });
    });

    it('should fail when character not found', async () => {
      const { Character } = require('../../../models/Character');
      Character.findById.mockResolvedValue(null);

      const result = await CharacterAccessUtils.getPermissions(validCharacterId, validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.CHARACTER_NOT_FOUND);
    });
  });

  describe('checkMultipleAccess', () => {
    it('should check access for multiple characters', async () => {
      const { Character } = require('../../../models/Character');
      const characters = [
        { ...mockCharacter, _id: { toString: () => validCharacterId } },
        { ...mockCharacter, _id: { toString: () => '507f1f77bcf86cd799439014' }, isPublic: true },
      ];
      Character.find.mockResolvedValue(characters);

      const result = await CharacterAccessUtils.checkMultipleAccess(
        [validCharacterId, '507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'],
        validUserId
      );
      expect(result.success).toBe(true);
      expect(result.data.accessible).toHaveLength(2);
      expect(result.data.denied).toEqual(['507f1f77bcf86cd799439015']);
    });

    it('should handle database errors', async () => {
      const { Character } = require('../../../models/Character');
      Character.find.mockRejectedValue(new Error('Database error'));

      const result = await CharacterAccessUtils.checkMultipleAccess([validCharacterId], validUserId);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.DATABASE_ERROR);
    });
  });

  describe('checkMultipleOwnership', () => {
    it('should check ownership for multiple characters', async () => {
      const { Character } = require('../../../models/Character');
      const ownedCharacters = [
        { ...mockCharacter, _id: { toString: () => validCharacterId } },
      ];
      Character.find.mockResolvedValue(ownedCharacters);

      const result = await CharacterAccessUtils.checkMultipleOwnership(
        [validCharacterId, '507f1f77bcf86cd799439014'],
        validUserId
      );
      expect(result.success).toBe(true);
      expect(result.data.owned).toHaveLength(1);
      expect(result.data.denied).toEqual(['507f1f77bcf86cd799439014']);
    });
  });

  describe('createUserAccessFilter', () => {
    it('should create access filter with ObjectId', () => {
      const filter = CharacterAccessUtils.createUserAccessFilter(validUserId);
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toHaveLength(2);
    });

    it('should handle ObjectId creation errors', () => {
      // Mock ObjectId to throw error
      const originalObjectId = require('mongoose').Types.ObjectId;
      require('mongoose').Types.ObjectId = jest.fn().mockImplementation(() => {
        throw new Error('Invalid ObjectId');
      });

      const filter = CharacterAccessUtils.createUserAccessFilter(validUserId);
      expect(filter).toHaveProperty('$or');

      // Restore original
      require('mongoose').Types.ObjectId = originalObjectId;
    });
  });

  describe('createOwnershipFilter', () => {
    it('should create ownership filter with ObjectId', () => {
      const filter = CharacterAccessUtils.createOwnershipFilter(validUserId);
      expect(filter).toHaveProperty('ownerId');
    });

    it('should handle ObjectId creation errors', () => {
      // Mock ObjectId to throw error
      const originalObjectId = require('mongoose').Types.ObjectId;
      require('mongoose').Types.ObjectId = jest.fn().mockImplementation(() => {
        throw new Error('Invalid ObjectId');
      });

      const filter = CharacterAccessUtils.createOwnershipFilter(validUserId);
      expect(filter).toEqual({ ownerId: validUserId });

      // Restore original
      require('mongoose').Types.ObjectId = originalObjectId;
    });
  });

  describe('prepareUserAccessQuery', () => {
    beforeEach(() => {
      const { Types } = require('mongoose');
      Types.ObjectId.isValid = jest.fn().mockReturnValue(true);
    });

    it('should prepare user access query', async () => {
      const baseFilter = { type: 'pc' };
      const result = await CharacterAccessUtils.prepareUserAccessQuery(baseFilter, validUserId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('$and');
    });

    it('should fail for invalid user ID', async () => {
      const { Types } = require('mongoose');
      Types.ObjectId.isValid.mockReturnValue(false);

      const result = await CharacterAccessUtils.prepareUserAccessQuery({}, 'invalid');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_OWNER_ID);
    });

    it('should fail for empty user ID', async () => {
      const result = await CharacterAccessUtils.prepareUserAccessQuery({}, '');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_OWNER_ID);
    });

    it('should fail for null user ID', async () => {
      const result = await CharacterAccessUtils.prepareUserAccessQuery({}, null as any);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_OWNER_ID);
    });

    it('should fail for undefined user ID', async () => {
      const result = await CharacterAccessUtils.prepareUserAccessQuery({}, undefined as any);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(CHARACTER_ERROR_CODES.INVALID_OWNER_ID);
    });
  });

  describe('checkCharacterInUse', () => {
    it('should return not in use (placeholder implementation)', async () => {
      const result = await CharacterAccessUtils.checkCharacterInUse(validCharacterId);
      expect(result.success).toBe(true);
      expect(result.data.inUse).toBe(false);
    });
  });
});