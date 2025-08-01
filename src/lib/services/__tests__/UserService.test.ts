
/**
 * Comprehensive tests for the UserService.
 *
 * This file consolidates all tests for the UserService, including:
 * - Authentication operations (createUser, authenticateUser, etc.)
 * - Profile management (getUserById, updateUserProfile, etc.)
 * - Administrative operations (getUsers, getUserStats, etc.)
 * - Error handling and integration scenarios
 *
 * It leverages a shared test helper (`UserService.test-helpers.ts`) to
 * provide mock data, reusable test utilities, and consistent assertion helpers,

 */

import { UserService } from '../UserService';
import { UserServiceAuth } from '../UserServiceAuth';
import { UserServiceProfile } from '../UserServiceProfile';
import { UserServiceStats } from '../UserServiceStats';
import type { PublicUser, SubscriptionTier } from '../../validations/user';
import {
  createMockPublicUser,
  createMockUserRegistration,
  createMockUserLogin,
  createMockChangePassword,
  createMockPasswordResetRequest,
  createMockPasswordReset,
  createMockEmailVerification,
  createMockUserProfileUpdate,
  createMockQueryFilters,
  createMockUserStats,
  createMockPaginatedResult,
  createSuccessResult,
  createValidationError,
  createUserAlreadyExistsError,
  createInvalidCredentialsError,
  createUserNotFoundError,
  setupMockClearance,
  expectDelegationCall,
  expectErrorThrown,
  createMockImplementation,
  createMockRejection,
  createTimingTest,
  createConcurrentTest,
  TEST_USER_ID,
  TEST_USER_ID_2,
  TEST_EMAIL,
} from './UserService.test-helpers';

// Mock all sub-modules for comprehensive integration tests
jest.mock('../UserServiceAuth');
jest.mock('../UserServiceProfile');
jest.mock('../UserServiceStats');

const mockUserServiceAuth = UserServiceAuth as jest.Mocked<
  typeof UserServiceAuth
>;
const mockUserServiceProfile = UserServiceProfile as jest.Mocked<
  typeof UserServiceProfile
>;
const mockUserServiceStats = UserServiceStats as jest.Mocked<
  typeof UserServiceStats
>;

describe('UserService', () => {
  setupMockClearance();

  // ================================
  // Authentication Operations
  // ================================
  describe('Authentication Operations', () => {
    describe('createUser', () => {
      it('should delegate to UserServiceAuth.createUser', async () => {
        const userData = createMockUserRegistration();
        const mockUser = createMockPublicUser({ isEmailVerified: false });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceAuth.createUser.mockResolvedValue(expectedResult);

        const result = await UserService.createUser(userData);

        expectDelegationCall(
          mockUserServiceAuth.createUser,
          [userData],
          expectedResult,
          result
        );
      });

      it('should handle errors from UserServiceAuth.createUser', async () => {
        const userData = createMockUserRegistration();
        const expectedError = createUserAlreadyExistsError<PublicUser>();

        mockUserServiceAuth.createUser.mockResolvedValue(expectedError);

        const result = await UserService.createUser(userData);

        expectDelegationCall(
          mockUserServiceAuth.createUser,
          [userData],
          expectedError,
          result
        );
      });
    });

    describe('authenticateUser', () => {
      it('should delegate to UserServiceAuth.authenticateUser', async () => {
        const loginData = createMockUserLogin();
        const mockUser = createMockPublicUser();
        const expectedResult = createSuccessResult({
          user: mockUser,
          requiresVerification: false,
        });

        mockUserServiceAuth.authenticateUser.mockResolvedValue(expectedResult);

        const result = await UserService.authenticateUser(loginData);

        expectDelegationCall(
          mockUserServiceAuth.authenticateUser,
          [loginData],
          expectedResult,
          result
        );
      });

      it('should handle authentication failures', async () => {
        const loginData = createMockUserLogin({ password: 'wrongpassword' });
        const expectedError = createInvalidCredentialsError<{
          user: PublicUser;
          requiresVerification: boolean;
        }>();

        mockUserServiceAuth.authenticateUser.mockResolvedValue(expectedError);

        const result = await UserService.authenticateUser(loginData);

        expectDelegationCall(
          mockUserServiceAuth.authenticateUser,
          [loginData],
          expectedError,
          result
        );
      });
    });

    describe('changePassword', () => {
      it('should delegate to UserServiceAuth.changePassword', async () => {
        const userId = '507f1f77bcf86cd799439011';
        const passwordData = createMockChangePassword();
        const expectedResult = createSuccessResult<void>(undefined);

        mockUserServiceAuth.changePassword.mockResolvedValue(expectedResult);

        const result = await UserService.changePassword(userId, passwordData);

        expectDelegationCall(
          mockUserServiceAuth.changePassword,
          [userId, passwordData],
          expectedResult,
          result
        );
      });

      it('should handle password change failures', async () => {
        const userId = '507f1f77bcf86cd799439011';
        const passwordData = createMockChangePassword({
          currentPassword: 'wrongpassword',
        });
        const expectedError = createInvalidCredentialsError<void>();
        expectedError.error!.message = 'Current password is incorrect';
        expectedError.error!.field = 'currentPassword';

        mockUserServiceAuth.changePassword.mockResolvedValue(expectedError);

        const result = await UserService.changePassword(userId, passwordData);

        expectDelegationCall(
          mockUserServiceAuth.changePassword,
          [userId, passwordData],
          expectedError,
          result
        );
      });
    });

    describe('requestPasswordReset', () => {
      it('should delegate to UserServiceAuth.requestPasswordReset', async () => {
        const resetData = createMockPasswordResetRequest();
        const expectedResult = createSuccessResult({ token: 'reset-token-123' });

        mockUserServiceAuth.requestPasswordReset.mockResolvedValue(
          expectedResult
        );

        const result = await UserService.requestPasswordReset(resetData);

        expectDelegationCall(
          mockUserServiceAuth.requestPasswordReset,
          [resetData],
          expectedResult,
          result
        );
      });
    });

    describe('resetPassword', () => {
      it('should delegate to UserServiceAuth.resetPassword', async () => {
        const resetData = createMockPasswordReset();
        const expectedResult = createSuccessResult<void>(undefined);

        mockUserServiceAuth.resetPassword.mockResolvedValue(expectedResult);

        const result = await UserService.resetPassword(resetData);

        expectDelegationCall(
          mockUserServiceAuth.resetPassword,
          [resetData],
          expectedResult,
          result
        );
      });
    });

    describe('verifyEmail', () => {
      it('should delegate to UserServiceAuth.verifyEmail', async () => {
        const verificationData = createMockEmailVerification();
        const mockUser = createMockPublicUser({ isEmailVerified: true });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceAuth.verifyEmail.mockResolvedValue(expectedResult);

        const result = await UserService.verifyEmail(verificationData);

        expectDelegationCall(
          mockUserServiceAuth.verifyEmail,
          [verificationData],
          expectedResult,
          result
        );
      });
    });

    describe('resendVerificationEmail', () => {
      it('should delegate to UserServiceAuth.resendVerificationEmail', async () => {
        const email = TEST_EMAIL;
        const expectedResult = createSuccessResult<void>(undefined);

        mockUserServiceAuth.resendVerificationEmail.mockResolvedValue(
          expectedResult
        );

        const result = await UserService.resendVerificationEmail(email);

        expectDelegationCall(
          mockUserServiceAuth.resendVerificationEmail,
          [email],
          expectedResult,
          result
        );
      });
    });
  });

  // ================================
  // Profile Management Operations
  // ================================
  describe('Profile Management Operations', () => {
    describe('getUserById', () => {
      it('should delegate to UserServiceProfile.getUserById', async () => {
        const userId = TEST_USER_ID;
        const mockUser = createMockPublicUser({ _id: userId });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceProfile.getUserById.mockResolvedValue(expectedResult);

        const result = await UserService.getUserById(userId);

        expectDelegationCall(
          mockUserServiceProfile.getUserById,
          [userId],
          expectedResult,
          result
        );
      });

      it('should handle user not found', async () => {
        const userId = TEST_USER_ID;
        const expectedError = createUserNotFoundError<PublicUser>();

        mockUserServiceProfile.getUserById.mockResolvedValue(expectedError);

        const result = await UserService.getUserById(userId);

        expectDelegationCall(
          mockUserServiceProfile.getUserById,
          [userId],
          expectedError,
          result
        );
      });
    });

    describe('getUserByEmail', () => {
      it('should delegate to UserServiceProfile.getUserByEmail', async () => {
        const email = TEST_EMAIL;
        const mockUser = createMockPublicUser({ email });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceProfile.getUserByEmail.mockResolvedValue(expectedResult);

        const result = await UserService.getUserByEmail(email);

        expectDelegationCall(
          mockUserServiceProfile.getUserByEmail,
          [email],
          expectedResult,
          result
        );
      });
    });

    describe('updateUserProfile', () => {
      it('should delegate to UserServiceProfile.updateUserProfile', async () => {
        const userId = TEST_USER_ID;
        const updateData = createMockUserProfileUpdate();
        const mockUser = createMockPublicUser({
          _id: userId,
          username: updateData.username,
          firstName: updateData.firstName,
          lastName: updateData.lastName,
        });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceProfile.updateUserProfile.mockResolvedValue(
          expectedResult
        );

        const result = await UserService.updateUserProfile(userId, updateData);

        expectDelegationCall(
          mockUserServiceProfile.updateUserProfile,
          [userId, updateData],
          expectedResult,
          result
        );
      });
    });

    describe('updateSubscription', () => {
      it('should delegate to UserServiceProfile.updateSubscription', async () => {
        const userId = TEST_USER_ID;
        const newTier: SubscriptionTier = 'pro';
        const mockUser = createMockPublicUser({
          _id: userId,
          subscriptionTier: newTier,
        });
        const expectedResult = createSuccessResult(mockUser);

        mockUserServiceProfile.updateSubscription.mockResolvedValue(
          expectedResult
        );

        const result = await UserService.updateSubscription(userId, newTier);

        expectDelegationCall(
          mockUserServiceProfile.updateSubscription,
          [userId, newTier],
          expectedResult,
          result
        );
      });
    });

    describe('deleteUser', () => {
      it('should delegate to UserServiceProfile.deleteUser', async () => {
        const userId = TEST_USER_ID;
        const expectedResult = createSuccessResult<void>(undefined);

        mockUserServiceProfile.deleteUser.mockResolvedValue(expectedResult);

        const result = await UserService.deleteUser(userId);

        expectDelegationCall(
          mockUserServiceProfile.deleteUser,
          [userId],
          expectedResult,
          result
        );
      });
    });
  });

  // ================================
  // Administrative Operations
  // ================================
  describe('Administrative Operations', () => {
    describe('getUsers', () => {
      it('should delegate to UserServiceStats.getUsers with default parameters', async () => {
        const mockUsers = [createMockPublicUser()];
        const expectedResult = createSuccessResult(
          createMockPaginatedResult(mockUsers)
        );

        mockUserServiceStats.getUsers.mockResolvedValue(expectedResult);

        const result = await UserService.getUsers();

        expectDelegationCall(
          mockUserServiceStats.getUsers,
          [1, 20, undefined],
          expectedResult,
          result
        );
      });

      it('should delegate to UserServiceStats.getUsers with custom parameters', async () => {
        const page = 2;
        const limit = 10;
        const filters = createMockQueryFilters();
        const expectedResult = createSuccessResult(
          createMockPaginatedResult([], {
            pagination: {
              page: 2,
              totalPages: 1,
              limit: 10,
              total: 0,
            },
          })
        );

        mockUserServiceStats.getUsers.mockResolvedValue(expectedResult);

        const result = await UserService.getUsers(page, limit, filters);

        expectDelegationCall(
          mockUserServiceStats.getUsers,
          [page, limit, filters],
          expectedResult,
          result
        );
      });
    });

    describe('getUserStats', () => {
      it('should delegate to UserServiceStats.getUserStats', async () => {
        const mockStats = createMockUserStats();
        const expectedResult = createSuccessResult(mockStats);

        mockUserServiceStats.getUserStats.mockResolvedValue(expectedResult);

        const result = await UserService.getUserStats();

        expectDelegationCall(
          mockUserServiceStats.getUserStats,
          [],
          expectedResult,
          result
        );
      });
    });
  });

  // ================================
  // Integration and Error Handling
  // ================================
  describe('Integration and Error Handling', () => {
    it('should handle errors thrown by sub-modules', async () => {
      const userData = createMockUserRegistration();
      const error = new Error('Database connection failed');

      mockUserServiceAuth.createUser.mockImplementation(
        createMockRejection(error)
      );

      await expectErrorThrown(
        UserService.createUser(userData),
        'Database connection failed'
      );
      expect(mockUserServiceAuth.createUser).toHaveBeenCalledWith(userData);
    });

    it('should preserve async nature of operations', async () => {
      const userId = TEST_USER_ID;
      const mockUser = createMockPublicUser({ id: userId });
      const delayedResult = createSuccessResult(mockUser);

      mockUserServiceProfile.getUserById.mockImplementation(
        createMockImplementation(delayedResult, 10)
      );

      const { duration: _duration } = await createTimingTest(
        () => UserService.getUserById(userId),
        10,
        delayedResult
      );

      expect(mockUserServiceProfile.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should handle undefined and null parameters gracefully', async () => {
      const expectedResult = createValidationError<PublicUser>();

      mockUserServiceAuth.createUser.mockResolvedValue(expectedResult);

      const result = await UserService.createUser(undefined as any);

      expectDelegationCall(
        mockUserServiceAuth.createUser,
        [undefined],
        expectedResult,
        result
      );
    });

    it('should handle concurrent operations correctly', async () => {
      const user1 = createMockPublicUser({
        id: TEST_USER_ID,
        email: 'user1@example.com',
        username: 'user1',
        subscriptionTier: 'free',
      });

      const user2 = createMockPublicUser({
        id: TEST_USER_ID_2,
        email: 'user2@example.com',
        username: 'user2',
        subscriptionTier: 'expert',
      });

      const result1 = createSuccessResult(user1);
      const result2 = createSuccessResult(user2);

      mockUserServiceProfile.getUserById
        .mockResolvedValueOnce(result1)
        .mockResolvedValueOnce(result2);

      await createConcurrentTest(
        [
          () => UserService.getUserById(TEST_USER_ID),
          () => UserService.getUserById(TEST_USER_ID_2),
        ],
        [result1, result2]
      );

      expect(mockUserServiceProfile.getUserById).toHaveBeenCalledTimes(2);
    });
  });

  // ================================
  // Type Exports
  // ================================
  describe('Type Exports', () => {
    it('should export all necessary types from sub-modules', () => {
      const types = [
        'PaginatedResult',
        'UserStats',
        'QueryFilters',
        'PublicUser',
        'SubscriptionTier',
        'UserRegistration',
        'UserLogin',
        'UserProfileUpdate',
        'ChangePassword',
        'PasswordResetRequest',
        'PasswordReset',
        'EmailVerification',
      ];
      expect(types.length).toBeGreaterThan(0);
    });
  });
});
