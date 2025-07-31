
import { UserService } from '../UserService';

jest.mock('../UserService');

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('UserServiceAuth.createUser', () => {
  it('should create a user successfully', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    mockUserService.createUser.mockResolvedValue({ success: true, data: { id: 'user123', ...userData } });

    const result = await UserService.createUser(userData);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe('user123');
  });

  it('should handle user creation failure', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    mockUserService.createUser.mockResolvedValue({ success: false, error: 'User already exists' });

    const result = await UserService.createUser(userData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('User already exists');
  });

  it('should handle unexpected errors during user creation', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    mockUserService.createUser.mockRejectedValue(new Error('Database error'));

    const result = await UserService.createUser(userData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });
});
