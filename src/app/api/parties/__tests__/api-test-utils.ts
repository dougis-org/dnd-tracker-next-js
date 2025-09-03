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