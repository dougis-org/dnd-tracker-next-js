// Re-export shared API test helpers to maintain backward compatibility
export { SHARED_API_TEST_CONSTANTS } from '@/lib/test-utils/shared-test-constants';
export {
  expectAuthenticationError,
  expectAuthorizationError,
  expectValidationError,
  expectServerError,
  setupAPITest,
  setupAPITestWithAuth,
  createRouteTestExecutor,
  executeTestRequest,
} from '@/lib/test-utils/shared-api-test-helpers';

// Re-export test utilities from centralized location to eliminate code duplication
export {
  TEST_USER_ID,
  createMockSession,
  createMockParams,
  createMockRequest,
  createMockUser,
  createRequestBody,
  expectSuccessResponse,
  expectErrorResponse,
} from '@/test-utils/test-helpers';
