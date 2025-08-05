import { NextRequest } from 'next/server';
import { PartyService } from '@/lib/services/PartyService';
import { withAuth, createSuccessResponse, handleServiceError } from '@/lib/api/route-helpers';
import { partyCreateSchema, partyQuerySchema, partyUpdateSchema } from '@/lib/validations/party';
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

// Mock types
export type MockedPartyService = jest.Mocked<typeof PartyService>;
export type MockedWithAuth = jest.MockedFunction<typeof withAuth>;
export type MockedCreateSuccessResponse = jest.MockedFunction<typeof createSuccessResponse>;
export type MockedHandleServiceError = jest.MockedFunction<typeof handleServiceError>;

// Mock setup helper
export const setupApiMocks = () => {
  // Mock the dependencies
  jest.mock('@/lib/services/PartyService');
  jest.mock('@/lib/api/route-helpers');
  jest.mock('@/lib/validations/party');

  const MockedPartyService = PartyService as MockedPartyService;
  const MockedWithAuth = withAuth as MockedWithAuth;
  const MockedCreateSuccessResponse = createSuccessResponse as MockedCreateSuccessResponse;
  const MockedHandleServiceError = handleServiceError as MockedHandleServiceError;
  const MockedPartyCreateSchema = partyCreateSchema as jest.Mocked<typeof partyCreateSchema>;
  const MockedPartyQuerySchema = partyQuerySchema as jest.Mocked<typeof partyQuerySchema>;
  const MockedPartyUpdateSchema = partyUpdateSchema as jest.Mocked<typeof partyUpdateSchema>;

  return {
    MockedPartyService,
    MockedWithAuth,
    MockedCreateSuccessResponse,
    MockedHandleServiceError,
    MockedPartyCreateSchema,
    MockedPartyQuerySchema,
    MockedPartyUpdateSchema,
  };
};

// Standard mock setup for beforeEach
export const setupStandardMocks = (mocks: ReturnType<typeof setupApiMocks>) => {
  const { MockedWithAuth, MockedCreateSuccessResponse, MockedHandleServiceError } = mocks;

  // Mock withAuth to call the callback with userId
  MockedWithAuth.mockImplementation(async (callback) => {
    return await callback(TEST_USER_ID);
  });

  // Mock createSuccessResponse to return a Response-like object
  MockedCreateSuccessResponse.mockImplementation((data) => {
    return {
      json: () => Promise.resolve(data),
      status: 200,
      ok: true,
    } as any;
  });

  // Mock handleServiceError to return an error Response-like object
  MockedHandleServiceError.mockImplementation(() => {
    return {
      json: () => Promise.resolve({ success: false, error: 'Test error' }),
      status: 500,
      ok: false,
    } as any;
  });
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
  return createMockRequest({
    method: 'GET',
    nextUrl: { searchParams: params } as any,
  });
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
export const mockValidationSuccess = (schema: jest.Mocked<any>, returnValue: any) => {
  schema.parse.mockReturnValue(returnValue);
};

export const mockValidationError = (schema: jest.Mocked<any>) => {
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