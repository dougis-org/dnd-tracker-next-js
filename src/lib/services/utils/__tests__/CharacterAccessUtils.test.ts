import { CharacterAccessUtils } from '../CharacterAccessUtils';
import { Types } from 'mongoose';
import { CharacterServiceErrors } from '../../CharacterServiceErrors';

// Mock mongoose to control ObjectId.isValid behavior
jest.mock('mongoose', () => {
  const MOCK_OBJECT_ID = '507f1f77bcf86cd799439011'; // Consistent valid ObjectId hex string

  return {
    Types: {
      ObjectId: jest.fn((id) => {
        // Simulate ObjectId constructor behavior
        const objId = new (jest.requireActual('mongoose').Types.ObjectId)(id || MOCK_OBJECT_ID);
        // Add toHexString and toString methods to the mocked ObjectId instance
        Object.assign(objId, {
          toHexString: () => objId.toString(),
          toString: () => objId.toHexString(),
        });
        return objId;
      }),
    },
    Schema: jest.fn(function() {
      this.Types = { ObjectId: jest.fn() };
    }),
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
              $or: [{ ownerId: new Types.ObjectId(userId) }, { isPublic: true }],
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