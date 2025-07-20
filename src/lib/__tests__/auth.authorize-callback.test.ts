import {
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import {
  setupAuthTestEnv,
  restoreAuthTestEnv,
  createMockUser,
  withConsoleSpy,
  setupCommonAuthTestMocks,
  getAuthConfig,
} from './auth-test-utils';

// Mock dependencies before importing
const mockGetUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockAuthenticateUser = jest.fn() as jest.MockedFunction<any>;
const mockNextAuth = jest.fn();

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: mockGetUserByEmail,
    authenticateUser: mockAuthenticateUser,
  },
}));

jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn().mockReturnValue({}),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('next-auth', () => mockNextAuth);

let originalEnv: NodeJS.ProcessEnv;

beforeAll(() => {
  originalEnv = setupAuthTestEnv();
});

afterAll(() => {
  restoreAuthTestEnv(originalEnv);
});

// Helper functions to reduce duplication
const createMockAuthData = () => {
  const mockUser = createMockUser({
    id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionTier: 'premium',
  });

  return {
    user: mockUser,
    getUserResult: { success: true, data: mockUser },
    authResult: { success: true, data: { user: mockUser } },
    credentials: { email: 'test@example.com', password: 'correctpassword' }
  };
};

describe('Authorize Function Tests', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
    if (mockGetUserByEmail) {
      mockGetUserByEmail.mockClear();
    }
    if (mockAuthenticateUser) {
      mockAuthenticateUser.mockClear();
    }
  });

  const testAuthorize = async (credentials: any, expectResult: any = null) => {
    const config = await getAuthConfigAsync();
    const authorizeFunc = config.providers[0].authorize;
    const result = await authorizeFunc(credentials);
    if (expectResult === null) {
      expect(result).toBeNull();
    } else {
      expect(result).toEqual(expectResult);
    }
    return result;
  };

  describe('Authorize Function Coverage', () => {
    // Test authorize function with missing credentials (lines 86-89)
    it('should test authorize with missing credentials', async () => {
      const testCases = [
        { password: 'test123' }, // missing email
        { email: 'test@example.com' }, // missing password
        {} // missing both
      ];

      for (const credentials of testCases) {
        await testAuthorize(credentials);
      }
    });

    // Test authorize function with UserService failures (lines 92-109)
    it('should test authorize with service failures', async () => {
      const mockData = createMockAuthData();

      // Test getUserByEmail failure
      mockGetUserByEmail.mockResolvedValue({ success: false, error: 'User not found' });
      await testAuthorize(mockData.credentials);

      // Test authenticateUser failure
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue({ success: false, error: 'Invalid password' });
      await testAuthorize(mockData.credentials);
    });

    // Test authorize function with successful authentication (lines 111-118)
    it('should test authorize with successful authentication', async () => {
      const mockData = createMockAuthData();
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue(mockData.authResult);

      await testAuthorize(mockData.credentials, {
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        subscriptionTier: 'premium',
      });
    });

    // Test authorize function with error handling (lines 119-123)
    it('should test authorize with error handling', async () => {
      mockGetUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      withConsoleSpy(_consoleSpy => {
        testAuthorize({ email: 'test@example.com', password: 'test123' });
      });
    });

    it('should test authorize with invalid credentials format', async () => {
      const invalidCredentials = [
        { email: '', password: 'validpassword' },
        { email: 'valid@email.com', password: '' },
        { email: 'invalid-email-format', password: 'validpassword' },
        null,
        undefined
      ];

      for (const credentials of invalidCredentials) {
        await testAuthorize(credentials);
      }
    });

    it('should test authorize with service timeout scenarios', async () => {
      const mockData = createMockAuthData();

      // Simulate timeout in getUserByEmail
      mockGetUserByEmail.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 100))
      );

      await testAuthorize(mockData.credentials);

      // Simulate timeout in authenticateUser
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 100))
      );

      await testAuthorize(mockData.credentials);
    });
  });
});