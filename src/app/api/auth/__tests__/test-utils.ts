/**
 * Shared test utilities for API auth tests
 * Consolidates duplicate helper functions to reduce code duplication
 */

import { NextRequest } from 'next/server';

/**
 * Creates a mock NextRequest with the provided body
 * @param body - The request body to mock
 * @returns A mocked NextRequest instance
 */
export const createMockRequest = (body: any): NextRequest => {
  const req = new NextRequest('https://example.com');
  // Use the mocked json method
  (req.json as jest.Mock).mockResolvedValue(body);
  return req;
};