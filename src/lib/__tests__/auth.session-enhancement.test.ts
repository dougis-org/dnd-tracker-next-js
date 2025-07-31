
import { enhanceSessionUserData } from '../auth';
import { UserService } from '../services/UserService';

jest.mock('../services/UserService');

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('enhanceSessionUserData', () => {
  const baseSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const baseUser = {
    id: 'user123',
    email: 'test@example.com',
    subscriptionTier: 'free',
  };

  it('should return the original session if user data is complete', async () => {
    const session = { ...baseSession, user: { ...baseSession.user, subscriptionTier: 'premium' } };
    const result = await enhanceSessionUserData(session, baseUser);
    expect(result).toEqual(session);
  });

  it('should add subscriptionTier from user object if missing in session', async () => {
    const result = await enhanceSessionUserData(baseSession, baseUser);
    expect(result.user.subscriptionTier).toBe('free');
  });

  it('should fetch additional user data from UserService if name is missing', async () => {
    const session = { user: { id: 'user123', email: 'test@example.com' } };
    const userServiceData = { success: true, data: { firstName: 'John', lastName: 'Doe', subscriptionTier: 'premium' } };
    mockUserService.getUserByEmail.mockResolvedValue(userServiceData);

    const result = await enhanceSessionUserData(session, baseUser);
    expect(result.user.name).toBe('John Doe');
    expect(result.user.subscriptionTier).toBe('premium');
  });

  it('should handle UserService lookup failure gracefully', async () => {
    const session = { user: { id: 'user123', email: 'test@example.com' } };
    const userServiceData = { success: false, error: 'User not found' };
    mockUserService.getUserByEmail.mockResolvedValue(userServiceData);

    const result = await enhanceSessionUserData(session, baseUser);
    expect(result.user.name).toBeUndefined();
    expect(result.user.subscriptionTier).toBe('free');
  });
});
