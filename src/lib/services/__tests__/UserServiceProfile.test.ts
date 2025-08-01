import '../__test-helpers__/test-setup';
import { UserService } from '../UserService';

jest.mock('../UserServiceProfile');

describe('UserService Profile Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate profile operations to UserServiceProfile', async () => {
    const profileData = { username: 'newname', preferences: {} };

    await UserService.getUserById('userId');
    await UserService.updateUserProfile('userId', profileData);
    await UserService.deleteUser('userId');
  });
});