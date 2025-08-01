import '../__test-helpers__/test-setup';
import { UserService } from '../UserService';

jest.mock('../UserServiceAuth');

describe('UserService Auth Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate auth operations to UserServiceAuth', async () => {
    const userData = { email: 'test@example.com', password: 'password123', username: 'test' };
    const loginData = { email: 'test@example.com', password: 'password123' };

    await UserService.createUser(userData);
    await UserService.authenticateUser(loginData);
    await UserService.changePassword('userId', { currentPassword: 'old', newPassword: 'new' });
    await UserService.requestPasswordReset({ email: 'test@example.com' });
    await UserService.resetPassword({ token: 'token', newPassword: 'new' });
    await UserService.verifyEmail({ token: 'token' });
    await UserService.resendVerificationEmail('test@example.com');
  });
});