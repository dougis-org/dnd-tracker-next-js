import { PartyService } from '../PartyService';
import { PartyServiceCRUD } from '../PartyServiceCRUD';
import { PartyServiceSearch } from '../PartyServiceSearch';
import type { PartyCreate, PartyUpdate, PartyFilters, PaginationParams } from '@/lib/validations/party';

// Mock the specialized service modules
jest.mock('../PartyServiceCRUD');
jest.mock('../PartyServiceSearch');

const MockedPartyServiceCRUD = PartyServiceCRUD as jest.Mocked<typeof PartyServiceCRUD>;
const MockedPartyServiceSearch = PartyServiceSearch as jest.Mocked<typeof PartyServiceSearch>;

describe('PartyService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const partyId = '507f1f77bcf86cd799439012';

  const mockPartyData: PartyCreate = {
    name: 'Test Party',
    description: 'A test party',
    tags: ['test'],
    isPublic: false,
    sharedWith: [],
    settings: {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
  };

  const mockPartyResponse = {
    id: partyId,
    ownerId: userId,
    name: 'Test Party',
    description: 'A test party',
    members: [],
    tags: ['test'],
    isPublic: false,
    sharedWith: [],
    settings: {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
    memberCount: 0,
    playerCharacterCount: 0,
    averageLevel: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createParty', () => {
      it('should delegate to PartyServiceCRUD.createParty', async () => {
        const expectedResult = { success: true, data: mockPartyResponse };
        MockedPartyServiceCRUD.createParty.mockResolvedValue(expectedResult);

        const result = await PartyService.createParty(userId, mockPartyData);

        expect(MockedPartyServiceCRUD.createParty).toHaveBeenCalledWith(userId, mockPartyData);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getPartyById', () => {
      it('should delegate to PartyServiceCRUD.getPartyById', async () => {
        const expectedResult = { success: true, data: mockPartyResponse };
        MockedPartyServiceCRUD.getPartyById.mockResolvedValue(expectedResult);

        const result = await PartyService.getPartyById(partyId, userId);

        expect(MockedPartyServiceCRUD.getPartyById).toHaveBeenCalledWith(partyId, userId);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('updateParty', () => {
      it('should delegate to PartyServiceCRUD.updateParty', async () => {
        const updateData: PartyUpdate = { name: 'Updated Party' };
        const expectedResult = { success: true, data: { ...mockPartyResponse, name: 'Updated Party' } };
        MockedPartyServiceCRUD.updateParty.mockResolvedValue(expectedResult);

        const result = await PartyService.updateParty(partyId, userId, updateData);

        expect(MockedPartyServiceCRUD.updateParty).toHaveBeenCalledWith(partyId, userId, updateData);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('deleteParty', () => {
      it('should delegate to PartyServiceCRUD.deleteParty', async () => {
        const expectedResult = { success: true };
        MockedPartyServiceCRUD.deleteParty.mockResolvedValue(expectedResult);

        const result = await PartyService.deleteParty(partyId, userId);

        expect(MockedPartyServiceCRUD.deleteParty).toHaveBeenCalledWith(partyId, userId);
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Search and Filtering Operations', () => {
    describe('getPartiesForUser', () => {
      it('should delegate to PartyServiceSearch.getPartiesForUser with defaults', async () => {
        const expectedResult = {
          success: true,
          data: {
            parties: [mockPartyResponse],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 1,
              itemsPerPage: 20,
            },
          },
        };
        MockedPartyServiceSearch.getPartiesForUser.mockResolvedValue(expectedResult);

        const result = await PartyService.getPartiesForUser(userId);

        expect(MockedPartyServiceSearch.getPartiesForUser).toHaveBeenCalledWith(
          userId,
          {},
          'name',
          'asc',
          { page: 1, limit: 20 }
        );
        expect(result).toEqual(expectedResult);
      });

      it('should delegate with custom parameters', async () => {
        const filters: PartyFilters = { search: 'test', tags: ['adventure'] };
        const pagination: PaginationParams = { page: 2, limit: 10 };
        const expectedResult = {
          success: true,
          data: {
            parties: [mockPartyResponse],
            pagination: {
              currentPage: 2,
              totalPages: 1,
              totalItems: 1,
              itemsPerPage: 10,
            },
          },
        };
        MockedPartyServiceSearch.getPartiesForUser.mockResolvedValue(expectedResult);

        const result = await PartyService.getPartiesForUser(
          userId,
          filters,
          'lastActivity',
          'desc',
          pagination
        );

        expect(MockedPartyServiceSearch.getPartiesForUser).toHaveBeenCalledWith(
          userId,
          filters,
          'lastActivity',
          'desc',
          pagination
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('searchPublicParties', () => {
      it('should delegate to PartyServiceSearch.searchPublicParties with defaults', async () => {
        const expectedResult = {
          success: true,
          data: {
            parties: [{ ...mockPartyResponse, isPublic: true }],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 1,
              itemsPerPage: 20,
            },
          },
        };
        MockedPartyServiceSearch.searchPublicParties.mockResolvedValue(expectedResult);

        const result = await PartyService.searchPublicParties();

        expect(MockedPartyServiceSearch.searchPublicParties).toHaveBeenCalledWith(
          undefined,
          'name',
          'asc',
          { page: 1, limit: 20 }
        );
        expect(result).toEqual(expectedResult);
      });

      it('should delegate with search query and custom parameters', async () => {
        const searchQuery = 'adventure';
        const pagination: PaginationParams = { page: 1, limit: 5 };
        const expectedResult = {
          success: true,
          data: {
            parties: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: 5,
            },
          },
        };
        MockedPartyServiceSearch.searchPublicParties.mockResolvedValue(expectedResult);

        const result = await PartyService.searchPublicParties(
          searchQuery,
          'createdAt',
          'desc',
          pagination
        );

        expect(MockedPartyServiceSearch.searchPublicParties).toHaveBeenCalledWith(
          searchQuery,
          'createdAt',
          'desc',
          pagination
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getSuggestedTags', () => {
      it('should delegate to PartyServiceSearch.getSuggestedTags', async () => {
        const expectedResult = {
          success: true,
          data: ['adventure', 'combat', 'roleplay'],
        };
        MockedPartyServiceSearch.getSuggestedTags.mockResolvedValue(expectedResult);

        const result = await PartyService.getSuggestedTags(userId);

        expect(MockedPartyServiceSearch.getSuggestedTags).toHaveBeenCalledWith(userId);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getPartyStats', () => {
      it('should delegate to PartyServiceSearch.getPartyStats', async () => {
        const expectedResult = {
          success: true,
          data: {
            totalParties: 10,
            ownedParties: 5,
            sharedParties: 3,
            publicParties: 2,
            recentActivity: 1,
          },
        };
        MockedPartyServiceSearch.getPartyStats.mockResolvedValue(expectedResult);

        const result = await PartyService.getPartyStats(userId);

        expect(MockedPartyServiceSearch.getPartyStats).toHaveBeenCalledWith(userId);
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('validatePartyAccess', () => {
      it('should delegate to PartyServiceCRUD.validatePartyAccess', () => {
        const mockParty = { ownerId: userId };
        MockedPartyServiceCRUD.validatePartyAccess.mockReturnValue(true);

        const result = PartyService.validatePartyAccess(mockParty, userId);

        expect(MockedPartyServiceCRUD.validatePartyAccess).toHaveBeenCalledWith(mockParty, userId);
        expect(result).toBe(true);
      });
    });

    describe('validatePartyOwnership', () => {
      it('should delegate to PartyServiceCRUD.validatePartyOwnership', () => {
        const mockParty = { ownerId: userId };
        MockedPartyServiceCRUD.validatePartyOwnership.mockReturnValue(true);

        const result = PartyService.validatePartyOwnership(mockParty, userId);

        expect(MockedPartyServiceCRUD.validatePartyOwnership).toHaveBeenCalledWith(mockParty, userId);
        expect(result).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from CRUD operations', async () => {
      const errorResult = {
        success: false,
        error: { message: 'Database error', code: 'DB_ERROR', statusCode: 500 },
      };
      MockedPartyServiceCRUD.createParty.mockResolvedValue(errorResult);

      const result = await PartyService.createParty(userId, mockPartyData);

      expect(result).toEqual(errorResult);
    });

    it('should propagate errors from search operations', async () => {
      const errorResult = {
        success: false,
        error: { message: 'Search error', code: 'SEARCH_ERROR', statusCode: 500 },
      };
      MockedPartyServiceSearch.getPartiesForUser.mockResolvedValue(errorResult);

      const result = await PartyService.getPartiesForUser(userId);

      expect(result).toEqual(errorResult);
    });
  });

  describe('Integration Verification', () => {
    it('should maintain consistent method signatures across modules', () => {
      // Verify that the facade correctly exposes all expected methods
      expect(typeof PartyService.createParty).toBe('function');
      expect(typeof PartyService.getPartyById).toBe('function');
      expect(typeof PartyService.updateParty).toBe('function');
      expect(typeof PartyService.deleteParty).toBe('function');
      expect(typeof PartyService.getPartiesForUser).toBe('function');
      expect(typeof PartyService.searchPublicParties).toBe('function');
      expect(typeof PartyService.getSuggestedTags).toBe('function');
      expect(typeof PartyService.getPartyStats).toBe('function');
      expect(typeof PartyService.validatePartyAccess).toBe('function');
      expect(typeof PartyService.validatePartyOwnership).toBe('function');
    });

    it('should use correct default parameters', async () => {
      const expectedResult = {
        success: true,
        data: {
          parties: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 },
        },
      };
      MockedPartyServiceSearch.getPartiesForUser.mockResolvedValue(expectedResult);

      // Test that defaults are properly applied
      await PartyService.getPartiesForUser(userId);

      expect(MockedPartyServiceSearch.getPartiesForUser).toHaveBeenCalledWith(
        userId,
        {}, // default filters
        'name', // default sortBy
        'asc', // default sortOrder
        { page: 1, limit: 20 } // default pagination
      );
    });
  });
});