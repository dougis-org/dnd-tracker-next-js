import { PATCH, GET } from '../route';
import {
  mockUserService,
  TEST_USER_ID,
  createMockUser,
  createRequestBody,
  expectSuccessResponse,
  expectErrorResponse,
  setupProfileTestDefaults,
  createProfileRouteExecutors,
  authTestPatterns
} from './shared-profile-test-setup';

// Mock dependencies
jest.mock('@/lib/services/UserService');
jest.mock('@clerk/nextjs/server');

describe('/api/users/[id]/profile', () => {
  const { executePatch, executeGet } = createProfileRouteExecutors(PATCH, GET, null);

  beforeEach(() => {
    setupProfileTestDefaults();
  });

  describe('PATCH /api/users/[id]/profile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedUser = createMockUser();
      const requestBody = createRequestBody();

      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: mockUpdatedUser,
      });

      const response = await executePatch(TEST_USER_ID, requestBody, 'PATCH');

      await expectSuccessResponse(response, {
        message: 'Profile updated successfully',
        user: mockUpdatedUser,
      });

      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(
        TEST_USER_ID,
        requestBody
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      await authTestPatterns.testUnauthenticated(executePatch, 'PATCH', mockUserService, 'updateUserProfile');
    });

    it('should return 403 when user tries to update another user\'s profile', async () => {
      await authTestPatterns.testUnauthorized(executePatch, 'PATCH', mockUserService, 'updateUserProfile');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = {
        displayName: '', // Invalid - empty string
        experienceLevel: 'invalid', // Invalid enum value
      };

      const response = await executePatch(TEST_USER_ID, invalidData, 'PATCH');

      await expectErrorResponse(response, 400, 'Validation error', true);
      expect(mockUserService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should handle UserService errors', async () => {
      mockUserService.updateUserProfile.mockResolvedValue({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
        },
      });

      const response = await executePatch(TEST_USER_ID, { displayName: 'Test' }, 'PATCH');

      await expectErrorResponse(response, 404, 'User not found');
    });
  });

  describe('GET /api/users/[id]/profile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = createMockUser();

      mockUserService.getUserById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const response = await executeGet(TEST_USER_ID, undefined, 'GET');

      await expectSuccessResponse(response, { user: mockUser });
      expect(mockUserService.getUserById).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return 401 when user is not authenticated', async () => {
      await authTestPatterns.testUnauthenticated(executeGet, 'GET', mockUserService, 'getUserById');
    });

    it('should return 403 when user tries to view another user\'s profile', async () => {
      await authTestPatterns.testUnauthorized(executeGet, 'GET', mockUserService, 'getUserById');
    });

    it('should return 404 when user is not found', async () => {
      mockUserService.getUserById.mockResolvedValue({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
        },
      });

      const response = await executeGet(TEST_USER_ID, undefined, 'GET');

      await expectErrorResponse(response, 404, 'User not found');
    });
  });
});