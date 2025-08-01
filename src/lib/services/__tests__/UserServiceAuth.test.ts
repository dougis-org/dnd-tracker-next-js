
import { UserService } from '../UserService';
import { UserServiceAuth } from '../UserServiceAuth';
import {
  createMockUserRegistration,
  createMockUserLogin,
  createMockChangePassword,
  createMockPasswordResetRequest,
  createMockPasswordReset,
  createMockEmailVerification,
  createMockPublicUser,
  createSuccessResult,
  createUserAlreadyExistsError,
  createInvalidCredentialsError,
  setupMockClearance,
  expectDelegationCall,
  TEST_EMAIL,
} from './UserService.test-helpers';

jest.mock('../UserServiceAuth');

const mockUserServiceAuth = UserServiceAuth as jest.Mocked<typeof UserServiceAuth>;

describe('UserService Authentication Operations', () => {
  setupMockClearance();

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
      const expectedError = createUserAlreadyExistsError();

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
      const expectedError = createInvalidCredentialsError();

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
      const expectedError = createInvalidCredentialsError();
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
