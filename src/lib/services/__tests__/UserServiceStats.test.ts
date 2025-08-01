import '../__test-helpers__/test-setup';
import { UserService } from '../UserService';

jest.mock('../UserServiceStats');

describe('UserService Stats Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate stats operations to UserServiceStats', async () => {
    await UserService.getUsers();
    await UserService.getUserStats();
  });
});