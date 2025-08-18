/**
 * Transformations Test Suite
 * Tests the transformation utilities for converting between service and client types
 */

import { toClientCharacter, toClientCharacters } from '../transformations';
import { ICharacter } from '@/lib/models/Character';

// Mock the character schema
jest.mock('@/lib/validations/character', () => ({
  Character: {},
  characterSchema: {
    parse: jest.fn(),
  },
}));

// Mock the Character model
jest.mock('@/lib/models/Character', () => ({
  ICharacter: {},
}));

describe('transformations', () => {
  const mockCharacterData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 10, maximum: 10, temporary: 0 },
    armorClass: 15,
    ownerId: '507f1f77bcf86cd799439012',
    type: 'pc' as const,
    race: 'human',
    classes: [{ name: 'fighter', level: 1 }],
  };

  const mockCharacter: Partial<ICharacter> = {
    toObject: jest.fn().mockReturnValue(mockCharacterData),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toClientCharacter', () => {
    it('should convert ICharacter to Client Character using schema parse', () => {
      const { characterSchema } = require('@/lib/validations/character');
      const expectedClientCharacter = { ...mockCharacterData, clientTransformed: true };
      characterSchema.parse.mockReturnValue(expectedClientCharacter);

      const result = toClientCharacter(mockCharacter as ICharacter);

      expect(mockCharacter.toObject).toHaveBeenCalledTimes(1);
      expect(characterSchema.parse).toHaveBeenCalledWith(mockCharacterData);
      expect(result).toBe(expectedClientCharacter);
    });

    it('should handle schema validation errors', () => {
      const { characterSchema } = require('@/lib/validations/character');
      const validationError = new Error('Invalid character data');
      characterSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      expect(() => {
        toClientCharacter(mockCharacter as ICharacter);
      }).toThrow(validationError);

      expect(mockCharacter.toObject).toHaveBeenCalledTimes(1);
      expect(characterSchema.parse).toHaveBeenCalledWith(mockCharacterData);
    });
  });

  describe('toClientCharacters', () => {
    it('should convert array of ICharacter to array of Client Characters', () => {
      const { characterSchema } = require('@/lib/validations/character');
      const mockCharacter2 = {
        ...mockCharacter,
        toObject: jest.fn().mockReturnValue({ ...mockCharacterData, name: 'Test Character 2' }),
      };

      const expectedClientCharacter1 = { ...mockCharacterData, clientTransformed: true };
      const expectedClientCharacter2 = { ...mockCharacterData, name: 'Test Character 2', clientTransformed: true };

      characterSchema.parse
        .mockReturnValueOnce(expectedClientCharacter1)
        .mockReturnValueOnce(expectedClientCharacter2);

      const result = toClientCharacters([mockCharacter as ICharacter, mockCharacter2 as ICharacter]);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(expectedClientCharacter1);
      expect(result[1]).toBe(expectedClientCharacter2);
      expect(characterSchema.parse).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', () => {
      const result = toClientCharacters([]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should propagate errors from individual character transformations', () => {
      const { characterSchema } = require('@/lib/validations/character');
      const validationError = new Error('Invalid character data');
      characterSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      expect(() => {
        toClientCharacters([mockCharacter as ICharacter]);
      }).toThrow(validationError);
    });
  });
});