/**
 * EncounterServiceSearch Tests
 * Tests the search functionality including validation in addOwnerFilter
 */

import { EncounterServiceSearch } from '../EncounterServiceSearch';
import { InvalidEncounterIdError } from '../EncounterServiceErrors';

// Mock the Encounter model
jest.mock('../../models/encounter', () => ({
  Encounter: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

// Mock EncounterServiceValidation
jest.mock('../EncounterServiceValidation', () => ({
  EncounterServiceValidation: {
    isValidObjectId: jest.fn(),
  },
}));

describe('EncounterServiceSearch', () => {
  const validOwnerId = '507f1f77bcf86cd799439011';
  const invalidOwnerId = 'invalid-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addOwnerFilter validation', () => {
    // Create a test method to access the private addOwnerFilter method
    const testAddOwnerFilter = (mongoQuery: any, params: any) => {
      // @ts-ignore - accessing private method for testing
      return EncounterServiceSearch.addOwnerFilter(mongoQuery, params);
    };

    it('should add owner filter when valid ownerId is provided', () => {
      const { EncounterServiceValidation } = require('../EncounterServiceValidation');
      EncounterServiceValidation.isValidObjectId.mockReturnValue(true);

      const mongoQuery = {};
      const params = { ownerId: validOwnerId };

      testAddOwnerFilter(mongoQuery, params);

      expect(mongoQuery).toEqual({ ownerId: validOwnerId });
      expect(EncounterServiceValidation.isValidObjectId).toHaveBeenCalledWith(validOwnerId);
    });

    it('should throw InvalidEncounterIdError when invalid ownerId is provided', () => {
      const { EncounterServiceValidation } = require('../EncounterServiceValidation');
      EncounterServiceValidation.isValidObjectId.mockReturnValue(false);

      const mongoQuery = {};
      const params = { ownerId: invalidOwnerId };

      expect(() => {
        testAddOwnerFilter(mongoQuery, params);
      }).toThrow(InvalidEncounterIdError);

      expect(EncounterServiceValidation.isValidObjectId).toHaveBeenCalledWith(invalidOwnerId);
    });

    it('should not modify mongoQuery when ownerId is not provided', () => {
      const mongoQuery = {};
      const params = {};

      testAddOwnerFilter(mongoQuery, params);

      expect(mongoQuery).toEqual({});
    });

    it('should not modify mongoQuery when ownerId is empty string', () => {
      const mongoQuery = {};
      const params = { ownerId: '' };

      testAddOwnerFilter(mongoQuery, params);

      expect(mongoQuery).toEqual({});
    });

    it('should not modify mongoQuery when ownerId is null', () => {
      const mongoQuery = {};
      const params = { ownerId: null };

      testAddOwnerFilter(mongoQuery, params);

      expect(mongoQuery).toEqual({});
    });

    it('should not modify mongoQuery when ownerId is undefined', () => {
      const mongoQuery = {};
      const params = { ownerId: undefined };

      testAddOwnerFilter(mongoQuery, params);

      expect(mongoQuery).toEqual({});
    });
  });
});