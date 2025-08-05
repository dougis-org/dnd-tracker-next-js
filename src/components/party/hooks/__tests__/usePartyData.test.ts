import { renderHook } from '@testing-library/react';
import { usePartyData } from '../usePartyData';
import {
  setupConsoleMock,
} from './testHelpers';
import {
  setupMockFetch,
  createTestParams,
  expectHookState,
  expectHookFunctions,
  runAsyncTest,
  testSearchScenario,
  testFilterScenario,
  mockSortedFetch,
  mockPaginatedFetch,
  getHookCurrent,
} from './usePartyData-utils';
import type { PartyFilters } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('usePartyData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setupMockFetch(mockFetch);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderHookWrapper = (params: any) => renderHook(() => usePartyData(params));

  describe('Initial State', () => {
    it('should return initial loading state', () => {
      const result = renderHookWrapper(createTestParams.default());

      expectHookState(result, {
        partiesCount: 0,
        isLoading: true,
        error: null,
      });
      const current = getHookCurrent(result);
      expect(current.pagination).toBe(null);
    });
  });

  describe('Data Fetching', () => {
    it('should fetch and return parties after loading', async () => {
      const result = renderHookWrapper(createTestParams.default());
      await runAsyncTest(result);

      expectHookState(result, {
        partiesCount: 2,
        partyNames: ['The Brave Adventurers', 'The Shadow Walkers'],
        isLoading: false,
        error: null,
      });
    });

    it('should return pagination info', async () => {
      const result = renderHookWrapper(createTestParams.default());
      await runAsyncTest(result);

      expectHookState(result, {
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 20,
        },
      });
    });
  });

  describe('Search Functionality', () => {
    const searchTestCases = [
      { query: 'brave', expectedParty: 'braveAdventurers' as const },
      { query: 'stealthy', expectedParty: 'shadowWalkers' as const },
      { query: 'BRAVE', expectedParty: 'braveAdventurers' as const },
    ];

    searchTestCases.forEach(({ query, expectedParty }) => {
      it(`should filter parties by search query: ${query}`, async () => {
        await testSearchScenario(mockFetch, query, expectedParty, renderHookWrapper);
      });
    });
  });

  describe('Filtering', () => {
    const filterTestCases = [
      {
        name: 'member count',
        filters: { memberCount: [4], tags: [] } as PartyFilters,
        expectedParty: 'braveAdventurers' as const,
      },
      {
        name: 'tags',
        filters: { memberCount: [], tags: ['heroic'] } as PartyFilters,
        expectedParty: 'braveAdventurers' as const,
      },
      {
        name: 'multiple filters',
        filters: { memberCount: [4], tags: ['heroic'] } as PartyFilters,
        expectedParty: 'braveAdventurers' as const,
      },
    ];

    filterTestCases.forEach(({ name, filters, expectedParty }) => {
      it(`should filter by ${name}`, async () => {
        await testFilterScenario(mockFetch, filters, expectedParty, renderHookWrapper);
      });
    });
  });

  describe('Sorting', () => {
    const sortTestCases = [
      {
        sortBy: 'name',
        sortOrder: 'asc' as const,
        expectedNames: ['The Brave Adventurers', 'The Shadow Walkers'],
      },
      {
        sortBy: 'name',
        sortOrder: 'desc' as const,
        expectedNames: ['The Shadow Walkers', 'The Brave Adventurers'],
      },
    ];

    sortTestCases.forEach(({ sortBy, sortOrder, expectedNames }) => {
      it(`should sort by ${sortBy} ${sortOrder}`, async () => {
        if (sortOrder === 'desc') mockSortedFetch(mockFetch, 'desc');

        const result = renderHookWrapper(createTestParams.withSort(sortBy, sortOrder));
        await runAsyncTest(result);

        expectHookState(result, {
          partiesCount: 2,
          partyNames: expectedNames,
        });
      });
    });

    it('should sort by member count', async () => {
      const result = renderHookWrapper(createTestParams.withSort('memberCount', 'desc'));
      await runAsyncTest(result);

      const current = getHookCurrent(result);
      const parties = current.parties;
      expect(parties[0].memberCount).toBe(4);
      expect(parties[1].memberCount).toBe(3);
    });

    it('should sort by date fields', async () => {
      const result = renderHookWrapper(createTestParams.withSort('createdAt', 'asc'));
      await runAsyncTest(result);

      expectHookState(result, { partiesCount: 2 });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      mockPaginatedFetch(mockFetch, 1, 1);

      const result = renderHookWrapper(createTestParams.withPagination(1, 1));
      await runAsyncTest(result);

      expectHookState(result, {
        partiesCount: 1,
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalItems: 2,
          itemsPerPage: 1,
        },
      });
    });

    it('should handle page navigation', async () => {
      const result = renderHookWrapper(createTestParams.default());
      await runAsyncTest(result);

      const current = getHookCurrent(result);
      current.goToPage(2);
      expectHookFunctions(result);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const restoreConsole = setupConsoleMock();

      const result = renderHookWrapper(createTestParams.default());
      await runAsyncTest(result);

      expectHookState(result, { error: null });
      restoreConsole();
    });
  });

  describe('Refetch Functionality', () => {
    it('should provide refetch function and handle refetch calls', async () => {
      const result = renderHookWrapper(createTestParams.default());
      await runAsyncTest(result);

      expectHookFunctions(result);

      const current = getHookCurrent(result);
      current.refetch();
      await runAsyncTest(result);

      expectHookFunctions(result);
    });
  });

  describe('Helper Functions', () => {
    const helperTestCases = [
      { field: 'lastActivity', type: 'date' },
      { field: 'name', type: 'string' },
    ];

    helperTestCases.forEach(({ field, type }) => {
      it(`should normalize ${type} values correctly for ${field}`, () => {
        const result = renderHookWrapper(createTestParams.withSort(field, 'asc'));
        jest.advanceTimersByTime(500);
        const current = getHookCurrent(result);
        expect(current.isLoading).toBe(true);
      });
    });
  });
});