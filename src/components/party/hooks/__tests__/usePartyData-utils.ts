import { RenderHookResult, act } from '@testing-library/react';
import type { PartyFilters, PartyListItem, PaginationInfo } from '../../types';

/**
 * Utilities specifically for usePartyData tests to reduce complexity and duplication
 */

// Mock party data generators
export const createMockParty = (overrides: Partial<PartyListItem> = {}): PartyListItem => ({
  id: '1',
  name: 'The Brave Adventurers',
  description: 'A group of brave adventurers',
  memberCount: 4,
  tags: ['heroic', 'combat'],
  createdAt: new Date().toISOString() as any,
  lastActivity: new Date().toISOString() as any,
  ...overrides,
});

export const MOCK_PARTIES = {
  braveAdventurers: createMockParty(),
  shadowWalkers: createMockParty({
    id: '2',
    name: 'The Shadow Walkers',
    description: 'A stealthy group',
    memberCount: 3,
    tags: ['stealth', 'infiltration'],
  }),
};

// Mock response builders
export const createMockApiResponse = (parties: PartyListItem[], pagination?: Partial<PaginationInfo>) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    success: true,
    parties,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: parties.length,
      itemsPerPage: 20,
      ...pagination,
    },
  }),
});

export const createFilteredResponse = (partyKey: keyof typeof MOCK_PARTIES) =>
  createMockApiResponse([MOCK_PARTIES[partyKey]]);

export const createSortedResponse = (order: 'asc' | 'desc' = 'asc') => {
  const parties = Object.values(MOCK_PARTIES);
  return order === 'desc'
    ? createMockApiResponse([MOCK_PARTIES.shadowWalkers, MOCK_PARTIES.braveAdventurers])
    : createMockApiResponse(parties);
};

export const createPaginatedResponse = (page: number, itemsPerPage: number) =>
  createMockApiResponse([MOCK_PARTIES.braveAdventurers], {
    currentPage: page,
    totalPages: 2,
    totalItems: 2,
    itemsPerPage,
  });

// Mock setup helpers
export const setupMockFetch = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  const defaultResponse = createMockApiResponse(Object.values(MOCK_PARTIES));
  mockFetch.mockResolvedValue(defaultResponse);
  return mockFetch;
};

export const mockFilteredFetch = (mockFetch: jest.MockedFunction<typeof fetch>, partyKey: keyof typeof MOCK_PARTIES) => {
  mockFetch.mockResolvedValueOnce(createFilteredResponse(partyKey));
};

export const mockSortedFetch = (mockFetch: jest.MockedFunction<typeof fetch>, order: 'asc' | 'desc' = 'asc') => {
  mockFetch.mockResolvedValueOnce(createSortedResponse(order));
};

export const mockPaginatedFetch = (mockFetch: jest.MockedFunction<typeof fetch>, page: number, itemsPerPage: number) => {
  mockFetch.mockResolvedValueOnce(createPaginatedResponse(page, itemsPerPage));
};

// Test parameter builders
export const createTestParams = {
  default: () => ({
    searchQuery: '',
    filters: { memberCount: [], tags: [] } as PartyFilters,
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    currentPage: 1,
    itemsPerPage: 20,
  }),

  withSearch: (query: string) => ({
    ...createTestParams.default(),
    searchQuery: query,
  }),

  withFilters: (filters: PartyFilters) => ({
    ...createTestParams.default(),
    filters,
  }),

  withSort: (sortBy: string, sortOrder: 'asc' | 'desc') => ({
    ...createTestParams.default(),
    sortBy,
    sortOrder,
  }),

  withPagination: (page: number, itemsPerPage: number) => ({
    ...createTestParams.default(),
    currentPage: page,
    itemsPerPage,
  }),
};

// Helper to safely get the current hook value
export const getHookCurrent = (result: RenderHookResult<any, any>) => {
  return result.current || (result as any).result?.current;
};

// Assertion helpers
export const expectHookState = (result: RenderHookResult<any, any>, expectedState: {
  partiesCount?: number;
  partyNames?: string[];
  isLoading?: boolean;
  error?: any;
  pagination?: Partial<PaginationInfo>;
}) => {
  const current = getHookCurrent(result);

  if (expectedState.partiesCount !== undefined) {
    expect(current.parties).toHaveLength(expectedState.partiesCount);
  }

  if (expectedState.partyNames) {
    expectedState.partyNames.forEach((name, index) => {
      expect(current.parties[index]?.name).toBe(name);
    });
  }

  if (expectedState.isLoading !== undefined) {
    expect(current.isLoading).toBe(expectedState.isLoading);
  }

  if (expectedState.error !== undefined) {
    expect(current.error).toBe(expectedState.error);
  }

  if (expectedState.pagination) {
    Object.entries(expectedState.pagination).forEach(([key, value]) => {
      expect(current.pagination?.[key]).toBe(value);
    });
  }
};

export const expectHookFunctions = (result: RenderHookResult<any, any>) => {
  const current = getHookCurrent(result);
  expect(typeof current.refetch).toBe('function');
  expect(typeof current.goToPage).toBe('function');
};

// Test execution helpers
export const runAsyncTest = async (_result: RenderHookResult<any, any>) => {
  await act(async () => {
    // Advance fake timers to trigger async operations
    jest.advanceTimersByTime(500);
    // Allow promises to resolve
    await Promise.resolve();
  });
};

export const testSearchScenario = async (
  mockFetch: jest.MockedFunction<typeof fetch>,
  searchQuery: string,
  expectedPartyKey: keyof typeof MOCK_PARTIES,
  hookRunner: (_params: any) => RenderHookResult<any, any>
) => {
  mockFilteredFetch(mockFetch, expectedPartyKey);
  const _params = createTestParams.withSearch(searchQuery);
  const result = hookRunner(_params);

  await runAsyncTest(result);

  expectHookState(result, {
    partiesCount: 1,
    partyNames: [MOCK_PARTIES[expectedPartyKey].name],
  });
};

export const testFilterScenario = async (
  mockFetch: jest.MockedFunction<typeof fetch>,
  filters: PartyFilters,
  expectedPartyKey: keyof typeof MOCK_PARTIES,
  hookRunner: (_params: any) => RenderHookResult<any, any>
) => {
  mockFilteredFetch(mockFetch, expectedPartyKey);
  const _params = createTestParams.withFilters(filters);
  const result = hookRunner(_params);

  await runAsyncTest(result);

  expectHookState(result, { partiesCount: 1 });
  const current = getHookCurrent(result);
  const party = current.parties[0];

  if (filters.memberCount?.length) {
    expect(party.memberCount).toBe(filters.memberCount[0]);
  }
  if (filters.tags?.length) {
    expect(party.tags).toContain(filters.tags[0]);
  }
};