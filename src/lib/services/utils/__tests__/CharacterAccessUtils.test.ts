import { CharacterAccessUtils } from '../CharacterAccessUtils';
import { Types } from 'mongoose';
import { CharacterServiceErrors } from '../../CharacterServiceErrors';

// Mock mongoose to control ObjectId.isValid behavior
jest.mock('mongoose', () => {
  const MOCK_OBJECT_ID = '507f1f77bcf86cd799439011'; // Consistent valid ObjectId hex string
  const mockObjectIdClass = jest.fn();

  const MockSchema = jest.fn().mockImplementation(function(definition, options) {
    this.definition = definition;
    this.options = options;
    this.index = jest.fn();
    this.pre = jest.fn();
    this.post = jest.fn();
    this.plugin = jest.fn();
    this.virtual = jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn()
    }));
    this.methods = {};
    this.statics = {};
  });

  MockSchema.Types = {
    ObjectId: mockObjectIdClass
  };

  const MockObjectId = jest.fn((id) => ({
    toString: () => id || MOCK_OBJECT_ID,
    toHexString: () => id || MOCK_OBJECT_ID,
  }));
  MockObjectId.isValid = jest.fn();

  return {
    Types: {
      ObjectId: MockObjectId,
    },
    Schema: MockSchema,
    models: {},
    model: jest.fn(() => ({
      // Mock Character.findById and Character.countDocuments
      findById: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      })),
    })),
    // Default export for import mongoose from 'mongoose'
    default: {
      Schema: MockSchema,
      models: {}
    }
  };
});

describe('CharacterAccessUtils', () => {
  describe('prepareUserAccessQuery', () => {
    it('should return a success result with a combined filter for a valid user ID', async () => {
      const userId = new Types.ObjectId().toHexString(); // Use toHexString for the input
      (Types.ObjectId.isValid as jest.Mock).mockReturnValue(true); // Mock isValid to return true

      const baseFilter = { name: 'test' };
      const result = await CharacterAccessUtils.prepareUserAccessQuery(baseFilter, userId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          $and: [
            {
              $or: [
                { ownerId: expect.objectContaining({ toHexString: expect.any(Function), toString: expect.any(Function) }) },
                { isPublic: true }
              ],
            },
            baseFilter,
          ],
        });
      }
    });

    it('should return an error result for an invalid user ID', async () => {
      const userId = 'invalid-user-id';
      (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false); // Mock isValid to return false

      const baseFilter = { name: 'test' };
      const result = await CharacterAccessUtils.prepareUserAccessQuery(baseFilter, userId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(CharacterServiceErrors.invalidOwnerId(userId));
      }
    });

    it('should return an error result for a null user ID', async () => {
      const userId = null;
      (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false); // Mock isValid to return false

      const baseFilter = { name: 'test' };
      const result = await CharacterAccessUtils.prepareUserAccessQuery(baseFilter, userId as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(CharacterServiceErrors.invalidOwnerId(userId as any));
      }
    });
  });
});