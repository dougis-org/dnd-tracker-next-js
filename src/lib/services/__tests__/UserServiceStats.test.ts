
import { UserService } from '../UserService';
import { UserServiceStats } from '../UserServiceStats';
import {
  createMockPublicUser,
  createMockQueryFilters,
  createMockUserStats,
  createMockPaginatedResult,
  createSuccessResult,
  setupMockClearance,
  expectDelegationCall,
} from './UserService.test-helpers';

jest.mock('../UserServiceStats');

const mockUserServiceStats = UserServiceStats as jest.Mocked<typeof UserServiceStats>;

describe('UserService Administrative Operations', () => {
  setupMockClearance();

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
