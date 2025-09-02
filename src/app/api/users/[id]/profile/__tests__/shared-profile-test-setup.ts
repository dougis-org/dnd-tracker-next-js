import { UserService } from '@/lib/services/UserService';
import { auth } from '@clerk/nextjs/server';
import { SHARED_API_TEST_CONSTANTS } from '@/lib/test-utils/shared-test-constants';
import {
  createMockUser,
  createRequestBody,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthenticationError,
  expectAuthorizationError,
  setupAPITestWithAuth,
  createRouteTestExecutor
} from '@/lib/test-utils/shared-api-test-helpers';

/**
 * Shared Profile API Test Setup
 *
 * Consolidates common mock setups and utilities for profile API route tests
 */

// Mock dependencies (to be used in test files)
export const mockUserService = UserService as jest.Mocked<typeof UserService>;
export const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Constants
export const TEST_USER_ID = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;

// Re-export commonly used helpers
export {
  createMockUser,
  createRequestBody,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthenticationError,
  expectAuthorizationError,
  setupAPITestWithAuth,
  createRouteTestExecutor
};

/**
 * Standard beforeEach setup for profile route tests
 */
export function setupProfileTestDefaults() {
  setupAPITestWithAuth(mockAuth, mockUserService);
}

/**
 * Create route executors for profile tests
 */
export function createProfileRouteExecutors(patchHandler: Function, getHandler: Function, deleteHandler: Function) {
  return {
    executePatch: createRouteTestExecutor(patchHandler, '/api/users'),
    executeGet: createRouteTestExecutor(getHandler, '/api/users'),
    executeDelete: createRouteTestExecutor(deleteHandler, '/api/users')
  };
}

/**
 * Common test patterns for authentication scenarios
 */
export const authTestPatterns = {
  testUnauthenticated: async (executor: Function, method: string, mockService: any, serviceMethod: string) => {
    mockAuth.mockResolvedValue(null);
    const response = await executor(TEST_USER_ID, method === 'PATCH' ? { displayName: 'Test' } : undefined, method);
    await expectAuthenticationError(response);
    expect(mockService[serviceMethod]).not.toHaveBeenCalled();
  },

  testUnauthorized: async (executor: Function, method: string, mockService: any, serviceMethod: string) => {
    const differentUserId = '507f1f77bcf86cd799439012';
    setupAPITestWithAuth(mockAuth, mockUserService, differentUserId);
    const response = await executor(TEST_USER_ID, method === 'PATCH' ? { displayName: 'Test' } : undefined, method);
    await expectAuthorizationError(response);
    expect(mockService[serviceMethod]).not.toHaveBeenCalled();
  }
};