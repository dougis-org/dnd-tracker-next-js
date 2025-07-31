
import { validateUserSignIn } from '../auth';
import { UserService } from '../services/UserService';

jest.mock('../services/UserService');

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('validateUserSignIn', () => {
  it('should return false if user email is missing', async () => {
    const result = await validateUserSignIn({}, {});
    expect(result).toBe(false);
  });

  it('should return true for credentials provider', async () => {
    const user = { email: 'test@example.com' };
    const account = { provider: 'credentials' };
    const result = await validateUserSignIn(user, account);
    expect(result).toBe(true);
  });

  it('should return true if user exists for other providers', async () => {
    const user = { email: 'test@example.com' };
    const account = { provider: 'google' };
    mockUserService.getUserByEmail.mockResolvedValue({ success: true, data: {} });

    const result = await validateUserSignIn(user, account);
    expect(result).toBe(true);
  });

  it('should return false if user does not exist for other providers', async () => {
    const user = { email: 'test@example.com' };
    const account = { provider: 'google' };
    mockUserService.getUserByEmail.mockResolvedValue({ success: false, error: 'User not found' });

    const result = await validateUserSignIn(user, account);
    expect(result).toBe(false);
  });
});
