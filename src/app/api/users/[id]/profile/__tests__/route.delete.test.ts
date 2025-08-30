import { DELETE } from '../route';
import {
  mockUserService,
  TEST_USER_ID,
  expectSuccessResponse,
  expectErrorResponse,
  setupProfileTestDefaults,
  createProfileRouteExecutors,
  authTestPatterns
} from './shared-profile-test-setup';

// Mock dependencies
jest.mock('@/lib/services/UserService');
jest.mock('@clerk/nextjs/server');

describe('DELETE /api/users/[id]/profile', () => {
  const { executeDelete } = createProfileRouteExecutors(null, null, DELETE);

  beforeEach(() => {
    setupProfileTestDefaults();
  });

  describe('Successful deletion', () => {
    it('should delete user account successfully', async () => {
      mockUserService.deleteUser.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const response = await executeDelete(TEST_USER_ID, undefined, 'DELETE');

      await expectSuccessResponse(response, {
        message: 'Account deleted successfully',
      });
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 when user is not authenticated', async () => {
      await authTestPatterns.testUnauthenticated(executeDelete, 'DELETE', mockUserService, 'deleteUser');
    });

    it('should return 403 when user tries to delete different account', async () => {
      await authTestPatterns.testUnauthorized(executeDelete, 'DELETE', mockUserService, 'deleteUser');
    });
  });

  describe('Service errors', () => {
    it('should handle user not found error', async () => {
      mockUserService.deleteUser.mockResolvedValue({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        message: 'User not found',
      });

      const response = await executeDelete(TEST_USER_ID, undefined, 'DELETE');

      await expectErrorResponse(response, 404, 'User not found');
    });

    it('should handle deletion failure', async () => {
      mockUserService.deleteUser.mockResolvedValue({
        success: false,
        error: { code: 'USER_DELETION_FAILED' },
        message: 'Failed to delete user',
      });

      const response = await executeDelete(TEST_USER_ID, undefined, 'DELETE');

      await expectErrorResponse(response, 500, 'Account deletion failed');
    });

    it('should handle unexpected errors', async () => {
      mockUserService.deleteUser.mockRejectedValue(new Error('Database connection failed'));

      const response = await executeDelete(TEST_USER_ID, undefined, 'DELETE');

      await expectErrorResponse(response, 500, 'Internal server error');
    });
  });

});