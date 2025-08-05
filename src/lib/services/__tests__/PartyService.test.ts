import { PartyService } from '../PartyService';
import { PartyServiceCRUD } from '../PartyServiceCRUD';
import { PartyServiceSearch } from '../PartyServiceSearch';
import type { PartyUpdate, PartyFilters, PaginationParams } from '@/lib/validations/party';
import {
  createMockPartyData,
  createMockPartyResponse,
  createMockPaginationInfo,
  createSuccessResult,
  testErrorPropagation,
  setupMockClearance,
  TEST_USER_ID,
  TEST_PARTY_ID,
} from './test-utils';

// Mock the specialized service modules
jest.mock('../PartyServiceCRUD');
jest.mock('../PartyServiceSearch');

const MockedPartyServiceCRUD = PartyServiceCRUD as jest.Mocked<typeof PartyServiceCRUD>;
const MockedPartyServiceSearch = PartyServiceSearch as jest.Mocked<typeof PartyServiceSearch>;

describe('PartyService', () => {
  const mockPartyData = createMockPartyData();
  const mockPartyResponse = createMockPartyResponse();

  setupMockClearance();

  describe('CRUD Operations', () => {
    const testCrudDelegation = async (
      method: keyof typeof PartyService,
      mockMethod: jest.Mock,
      args: any[],
      expectedData: any = mockPartyResponse
    ) => {
      const expectedResult = createSuccessResult(expectedData);
      mockMethod.mockResolvedValue(expectedResult);

      const result = await (PartyService[method] as any)(...args);

      expect(mockMethod).toHaveBeenCalledWith(...args);
      expect(result).toEqual(expectedResult);
    };

    it('should delegate createParty to PartyServiceCRUD', async () => {
      await testCrudDelegation('createParty', MockedPartyServiceCRUD.createParty, [TEST_USER_ID, mockPartyData]);
    });

    it('should delegate getPartyById to PartyServiceCRUD', async () => {
      await testCrudDelegation('getPartyById', MockedPartyServiceCRUD.getPartyById, [TEST_PARTY_ID, TEST_USER_ID]);
    });

    it('should delegate updateParty to PartyServiceCRUD', async () => {
      const updateData: PartyUpdate = { name: 'Updated Party' };
      const updatedResponse = createMockPartyResponse({ name: 'Updated Party' });
      await testCrudDelegation('updateParty', MockedPartyServiceCRUD.updateParty, [TEST_PARTY_ID, TEST_USER_ID, updateData], updatedResponse);
    });

    it('should delegate deleteParty to PartyServiceCRUD', async () => {
      await testCrudDelegation('deleteParty', MockedPartyServiceCRUD.deleteParty, [TEST_PARTY_ID, TEST_USER_ID], undefined);
    });
  });

  describe('Search and Filtering Operations', () => {
    const testSearchDelegation = async (
      method: keyof typeof PartyService,
      mockMethod: jest.Mock,
      args: any[],
      expectedData: any
    ) => {
      const expectedResult = createSuccessResult(expectedData);
      mockMethod.mockResolvedValue(expectedResult);

      const result = await (PartyService[method] as any)(...args);

      expect(mockMethod).toHaveBeenCalledWith(...args);
      expect(result).toEqual(expectedResult);
    };

    it('should delegate getPartiesForUser with defaults', async () => {
      const expectedData = {
        parties: [mockPartyResponse],
        pagination: createMockPaginationInfo(),
      };
      await testSearchDelegation(
        'getPartiesForUser',
        MockedPartyServiceSearch.getPartiesForUser,
        [TEST_USER_ID, { tags: [], memberCount: [] }, 'name', 'asc', { page: 1, limit: 20 }],
        expectedData
      );
    });

    it('should delegate getPartiesForUser with custom parameters', async () => {
      const filters: PartyFilters = { search: 'test', tags: ['adventure'] };
      const pagination: PaginationParams = { page: 2, limit: 10 };
      const expectedData = {
        parties: [mockPartyResponse],
        pagination: createMockPaginationInfo({ currentPage: 2, itemsPerPage: 10 }),
      };
      await testSearchDelegation(
        'getPartiesForUser',
        MockedPartyServiceSearch.getPartiesForUser,
        [TEST_USER_ID, filters, 'lastActivity', 'desc', pagination],
        expectedData
      );
    });

    it('should delegate searchPublicParties with defaults', async () => {
      const expectedData = {
        parties: [createMockPartyResponse({ isPublic: true })],
        pagination: createMockPaginationInfo(),
      };
      await testSearchDelegation(
        'searchPublicParties',
        MockedPartyServiceSearch.searchPublicParties,
        [undefined, 'name', 'asc', { page: 1, limit: 20 }],
        expectedData
      );
    });

    it('should delegate getSuggestedTags', async () => {
      await testSearchDelegation(
        'getSuggestedTags',
        MockedPartyServiceSearch.getSuggestedTags,
        [TEST_USER_ID],
        ['adventure', 'combat', 'roleplay']
      );
    });

    it('should delegate getPartyStats', async () => {
      const expectedStats = {
        totalParties: 10,
        ownedParties: 5,
        sharedParties: 3,
        publicParties: 2,
        recentActivity: 1,
      };
      await testSearchDelegation(
        'getPartyStats',
        MockedPartyServiceSearch.getPartyStats,
        [TEST_USER_ID],
        expectedStats
      );
    });
  });

  describe('Utility Methods', () => {
    const testUtilityDelegation = (
      method: keyof typeof PartyService,
      mockMethod: jest.Mock,
      args: any[],
      expectedReturn: any
    ) => {
      mockMethod.mockReturnValue(expectedReturn);
      const result = (PartyService[method] as any)(...args);
      expect(mockMethod).toHaveBeenCalledWith(...args);
      expect(result).toBe(expectedReturn);
    };

    it('should delegate validatePartyAccess to PartyServiceCRUD', () => {
      const mockParty = { ownerId: TEST_USER_ID };
      testUtilityDelegation('validatePartyAccess', MockedPartyServiceCRUD.validatePartyAccess, [mockParty, TEST_USER_ID], true);
    });

    it('should delegate validatePartyOwnership to PartyServiceCRUD', () => {
      const mockParty = { ownerId: TEST_USER_ID };
      testUtilityDelegation('validatePartyOwnership', MockedPartyServiceCRUD.validatePartyOwnership, [mockParty, TEST_USER_ID], true);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from CRUD operations', async () => {
      await testErrorPropagation(
        () => PartyService.createParty(TEST_USER_ID, mockPartyData),
        MockedPartyServiceCRUD.createParty
      );
    });

    it('should propagate errors from search operations', async () => {
      await testErrorPropagation(
        () => PartyService.getPartiesForUser(TEST_USER_ID),
        MockedPartyServiceSearch.getPartiesForUser
      );
    });
  });

  describe('Integration Verification', () => {
    const expectedMethods = [
      'createParty', 'getPartyById', 'updateParty', 'deleteParty',
      'getPartiesForUser', 'searchPublicParties', 'getSuggestedTags',
      'getPartyStats', 'validatePartyAccess', 'validatePartyOwnership'
    ];

    it('should maintain consistent method signatures across modules', () => {
      expectedMethods.forEach(method => {
        expect(typeof PartyService[method as keyof typeof PartyService]).toBe('function');
      });
    });

    it('should use correct default parameters', async () => {
      const expectedResult = createSuccessResult({
        parties: [],
        pagination: createMockPaginationInfo({ totalPages: 0, totalItems: 0 }),
      });
      MockedPartyServiceSearch.getPartiesForUser.mockResolvedValue(expectedResult);

      await PartyService.getPartiesForUser(TEST_USER_ID);

      expect(MockedPartyServiceSearch.getPartiesForUser).toHaveBeenCalledWith(
        TEST_USER_ID,
        { tags: [], memberCount: [] },
        'name',
        'asc',
        { page: 1, limit: 20 }
      );
    });
  });
});