import { NextRequest } from 'next/server';
import {
  createMockPartyData,
  createMockPartyResponse,
  createMockPaginationInfo,
  createSuccessResult,
  createErrorResult,
  TEST_USER_ID,
  TEST_PARTY_ID,
} from '@/lib/services/__tests__/test-utils';

/**
 * Test utilities for API route tests
 * Reduces duplication and provides consistent mocking patterns
 */

// Re-export common utilities
export {
  createMockPartyData,
  createMockPartyResponse,
  createMockPaginationInfo,
  createSuccessResult,
  createErrorResult,
  TEST_USER_ID,
  TEST_PARTY_ID,
};

// Mock setup at top level
jest.mock('@/lib/services/PartyService', () => ({
  PartyService: {
    getPartiesForUser: jest.fn(),
    createParty: jest.fn(),
    getPartyById: jest.fn(),
    updateParty: jest.fn(),
    deleteParty: jest.fn(),
  },
}));

jest.mock('@/lib/api/route-helpers', () => ({
  withAuth: jest.fn(),
  createSuccessResponse: jest.fn(),
  handleServiceError: jest.fn(),
}));

jest.mock('@/lib/validations/party', () => ({
  partyCreateSchema: {
    parse: jest.fn(),
  },
  partyQuerySchema: {
    parse: jest.fn(),
  },
  partyUpdateSchema: {
    parse: jest.fn(),
  },
}));

// Helper to get mocked modules
export const getMocks = () => {
  const { PartyService } = require('@/lib/services/PartyService');
  const { withAuth, createSuccessResponse, handleServiceError } = require('@/lib/api/route-helpers');
  const { partyCreateSchema, partyQuerySchema, partyUpdateSchema } = require('@/lib/validations/party');

  return {
    PartyService,
    withAuth,
    createSuccessResponse,
    handleServiceError,
    partyCreateSchema,
    partyQuerySchema,
    partyUpdateSchema,
  };
};

// Standard mock setup for beforeEach
export const setupStandardMocks = () => {
  const mocks = getMocks();

  // Mock withAuth to call the callback with userId
  mocks.withAuth.mockImplementation(async (callback: (_userId: string) => Promise<any>) => {
    return await callback(TEST_USER_ID);
  });

  // Mock createSuccessResponse to return a Response-like object
  mocks.createSuccessResponse.mockImplementation((data: any) => {
    return {
      json: () => Promise.resolve(data),
      status: 200,
      ok: true,
    };
  });

  // Mock handleServiceError to return an error Response-like object
  mocks.handleServiceError.mockImplementation(() => {
    return {
      json: () => Promise.resolve({ success: false, error: 'Test error' }),
      status: 500,
      ok: false,
    };
  });

  return mocks;
};

// Request builders
export const createMockRequest = (overrides: Partial<{
  method: string;
  url: string;
  json: () => Promise<any>;
  searchParams: URLSearchParams;
}> = {}) => {
  const baseRequest = {
    method: 'GET',
    url: 'http://localhost:3000/api/parties',
    json: () => Promise.resolve({}),
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
    ...overrides,
  };

  return baseRequest as unknown as NextRequest;
};

export const createGetRequest = (searchParams?: Record<string, string>) => {
  const params = new URLSearchParams(searchParams || {});
  const url = `http://localhost:3000/api/parties?${params.toString()}`;

  // Create a mock request with proper URL parsing
  const mockRequest = {
    method: 'GET',
    url,
    json: () => Promise.resolve({}),
    nextUrl: { searchParams: params },
  } as unknown as NextRequest;

  // Add URL constructor compatibility
  Object.defineProperty(mockRequest, 'url', {
    value: url,
    writable: false,
  });

  return mockRequest;
};

export const createPostRequest = (body: any) => {
  return createMockRequest({
    method: 'POST',
    json: () => Promise.resolve(body),
  });
};

export const createPutRequest = (body: any) => {
  return createMockRequest({
    method: 'PUT',
    json: () => Promise.resolve(body),
  });
};

// Test scenario helpers
export const testSuccessScenario = async (
  handler: (_req: NextRequest, _context?: any) => Promise<Response>,
  _request: NextRequest,
  expectedServiceCall: jest.Mock,
  expectedArgs: any[],
  expectedResponse: any,
  _context?: any
) => {
  expectedServiceCall.mockResolvedValue(createSuccessResult(expectedResponse));

  const response = await handler(_request, _context);

  expect(expectedServiceCall).toHaveBeenCalledWith(...expectedArgs);
  expect(response).toBeDefined();
};

export const testErrorScenario = async (
  handler: (_req: NextRequest, _context?: any) => Promise<Response>,
  _request: NextRequest,
  expectedServiceCall: jest.Mock,
  expectedArgs: any[],
  _context?: any
) => {
  expectedServiceCall.mockResolvedValue(createErrorResult('Test error', 'TEST_ERROR'));

  const response = await handler(_request, _context);

  expect(expectedServiceCall).toHaveBeenCalledWith(...expectedArgs);
  expect(response).toBeDefined();
};

// Validation mock helpers
export const mockValidationSuccess = (schema: any, returnValue: any) => {
  schema.parse.mockReturnValue(returnValue);
};

export const mockValidationError = (schema: any) => {
  schema.parse.mockImplementation(() => {
    throw new Error('Validation error');
  });
};

// Common test data
export const DEFAULT_QUERY_PARAMS = {
  page: '1',
  limit: '20',
  sortBy: 'name',
  sortOrder: 'asc',
};

export const SAMPLE_PARTY_DATA = createMockPartyData();
export const SAMPLE_PARTY_RESPONSE = createMockPartyResponse();
export const SAMPLE_PAGINATION = createMockPaginationInfo();