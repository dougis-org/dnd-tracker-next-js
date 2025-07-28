import { describe, it, expect } from '@jest/globals';

// Mock auth module FIRST - this must be before any imports that use it
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/lib/services/UserService');

// Import everything after mocks are set up
import { GET, PATCH } from '../route';
import { UserService } from '@/lib/services/UserService';
import { getServerSession } from '@/lib/auth/server-session';
import {
  TEST_USERS,
  testAuthenticatedRoute,
  testUnauthenticatedRoute,
  expectSuccessResponse,
  expectAuthenticationError,
  expectValidationError,
  expectForbiddenError,
  expectSuccessData,
  expectErrorData,
  setupApiRouteTests,
} from '@/__tests__/auth-session-test-helpers';

// Get the mocked function from the module
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('/api/users/[id]/profile API Route', () => {
  setupApiRouteTests();

  const testUserId = TEST_USERS.FREE_USER.userId;
  const mockUserProfile = {
    _id: testUserId,
    email: 'test@example.com',
    subscriptionTier: 'free' as const,
    profile: {
      displayName: 'Test User',
      bio: 'Test bio',
      avatar: null,
    },
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  };

  describe('GET /api/users/[id]/profile', () => {
    it('should return user profile for authenticated user', async () => {
      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockUserProfile
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER,
        params: { id: testUserId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.profile.displayName).toBe('Test User');
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith(testUserId);
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(GET, {
        params: { id: testUserId }
      });
      expectAuthenticationError(response);
    });

    it('should return 403 when accessing another user profile', async () => {
      const { response } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER,
        params: { id: 'different-user-id' }
      });
      expectForbiddenError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockUserService.getUserProfile.mockResolvedValue({
        success: false,
        error: { message: 'User not found' }
      });

      const { response, data } = await testAuthenticatedRoute(GET, {
        user: TEST_USERS.FREE_USER,
        params: { id: testUserId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });

  describe('PATCH /api/users/[id]/profile', () => {
    const validUpdateData = {
      profile: {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      },
      preferences: {
        theme: 'light',
        notifications: false,
      },
    };

    it('should update user profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, ...validUpdateData };
      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedProfile
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validUpdateData,
        user: TEST_USERS.FREE_USER,
        params: { id: testUserId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.profile.displayName).toBe('Updated Name');
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(
        testUserId,
        validUpdateData
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validUpdateData,
        params: { id: testUserId }
      });
      expectAuthenticationError(response);
    });

    it('should return 403 when updating another user profile', async () => {
      const { response } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validUpdateData,
        user: TEST_USERS.FREE_USER,
        params: { id: 'different-user-id' }
      });
      expectForbiddenError(response);
    });

    it('should validate request body', async () => {
      const invalidData = { invalidField: 'invalid' };

      const { response } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: invalidData,
        user: TEST_USERS.FREE_USER,
        params: { id: testUserId }
      });

      expectValidationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockUserService.updateUserProfile.mockResolvedValue({
        success: false,
        error: { message: 'Update failed' }
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validUpdateData,
        user: TEST_USERS.FREE_USER,
        params: { id: testUserId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });
});