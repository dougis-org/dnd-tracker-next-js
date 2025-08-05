import type { PartyCreate, PartyListItem, PaginationInfo } from '@/lib/validations/party';

/**
 * Test utilities for Party service tests
 * Reduces code duplication and provides consistent test data
 */

// Mock ObjectId creation with proper methods
export const createMockObjectId = (id: string = '507f1f77bcf86cd799439011') => ({
  toString: () => id,
  equals: (other: any) => other && other.toString() === id,
});

// Standard test user IDs
export const TEST_USER_ID = '507f1f77bcf86cd799439011';
export const TEST_PARTY_ID = '507f1f77bcf86cd799439012';
export const TEST_OTHER_USER_ID = '507f1f77bcf86cd799439013';

// Standard mock party data
export const createMockPartyData = (overrides: Partial<PartyCreate> = {}): PartyCreate => ({
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
  ...overrides,
});

// Standard mock party response
export const createMockPartyResponse = (overrides: Partial<PartyListItem> = {}): PartyListItem => ({
  id: TEST_PARTY_ID,
  ownerId: TEST_USER_ID,
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
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  lastActivity: new Date('2024-01-01T00:00:00.000Z'),
  memberCount: 0,
  playerCharacterCount: 0,
  averageLevel: 0,
  ...overrides,
});

// Standard pagination info
export const createMockPaginationInfo = (overrides: Partial<PaginationInfo> = {}): PaginationInfo => ({
  currentPage: 1,
  totalPages: 1,
  totalItems: 1,
  itemsPerPage: 20,
  ...overrides,
});

// Standard service result builders
export const createSuccessResult = <T>(data: T) => ({
  success: true as const,
  data,
});

export const createErrorResult = (message: string, code: string, statusCode: number = 400) => ({
  success: false as const,
  error: { message, code, statusCode },
});

// Mock setup helpers
export const setupMockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
};

export const setupMockClearance = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};

// Common test scenarios
export const testErrorPropagation = async (
  serviceMethod: () => Promise<any>,
  mockMethod: jest.Mock,
  expectedError = createErrorResult('Test error', 'TEST_ERROR', 500)
) => {
  mockMethod.mockResolvedValue(expectedError);
  const result = await serviceMethod();
  expect(result).toEqual(expectedError);
};

// API response helpers
export const createMockResponse = (data: any, status = 200) => ({
  ok: status < 400,
  status,
  json: () => Promise.resolve(data),
  statusText: status === 200 ? 'OK' : 'Error',
});

export const createMockFetch = (response: any, status = 200) =>
  jest.fn().mockResolvedValue(createMockResponse(response, status));