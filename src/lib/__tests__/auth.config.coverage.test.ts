
import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';
import {
  authTestAssertions,
  setupCommonAuthTestMocks,
  createMockAuthData,
  testAuthorize,
  testCallback,
  setupEnvironment,
  withConsoleSpy,
} from './auth-test-utils';

const mockGetUserByEmail = jest.fn() as jest.MockedFunction<any>;
const mockAuthenticateUser = jest.fn() as jest.MockedFunction<any>;
const mockNextAuth = jest.fn();

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: mockGetUserByEmail,
    authenticateUser: mockAuthenticateUser,
  },
}));

jest.mock('next-auth', () => mockNextAuth);

describe('NextAuth Configuration Coverage', () => {
  beforeEach(() => {
    setupCommonAuthTestMocks(mockNextAuth);
    if (mockGetUserByEmail) {
      mockGetUserByEmail.mockClear();
    }
    if (mockAuthenticateUser) {
      mockAuthenticateUser.mockClear();
    }
  });

  it('should test complete NextAuth configuration', async () => {
    process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
    process.env.NODE_ENV = 'production';
    process.env.AUTH_TRUST_HOST = 'true';
    process.env.MONGODB_DB_NAME = 'testdb';

    jest.resetModules();
    const authModule = await import('../auth');

    expect(mockNextAuth).toHaveBeenCalledTimes(1);
    const config = mockNextAuth.mock.calls[0][0];

    expect(config.adapter).toBeDefined();
    expect(config.trustHost).toBe(true);
    expect(config.url).toBeDefined();
    expect(config.providers).toBeDefined();
    expect(config.providers[0].name).toBe('credentials');
    expect(config.debug).toBe(false);

    authTestAssertions.expectModuleExports(authModule);
  });

  it('should test NextAuth configuration in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const authModule = await import('../auth');

    const config = mockNextAuth.mock.calls[0][0];
    expect(config.debug).toBe(true);
    authTestAssertions.expectModuleExports(authModule);
  });

  describe('Authorize Function Coverage', () => {
    it('should test authorize with missing credentials', async () => {
      const testCases = [
        { password: 'test123' },
        { email: 'test@example.com' },
        {}
      ];

      for (const credentials of testCases) {
        await testAuthorize(mockNextAuth, credentials);
      }
    });

    it('should test authorize with service failures', async () => {
      const mockData = createMockAuthData();

      mockGetUserByEmail.mockResolvedValue({ success: false, error: 'User not found' });
      await testAuthorize(mockNextAuth, mockData.credentials);

      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue({ success: false, error: 'Invalid password' });
      await testAuthorize(mockNextAuth, mockData.credentials);
    });

    it('should test authorize with successful authentication', async () => {
      const mockData = createMockAuthData();
      mockGetUserByEmail.mockResolvedValue(mockData.getUserResult);
      mockAuthenticateUser.mockResolvedValue(mockData.authResult);

      await testAuthorize(mockNextAuth, mockData.credentials, {
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        subscriptionTier: 'premium',
      });
    });

    it('should test authorize with error handling', async () => {
      mockGetUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      withConsoleSpy(_consoleSpy => {
        testAuthorize(mockNextAuth, { email: 'test@example.com', password: 'test123' });
      });
    });
  });

  describe('Redirect Callback Coverage', () => {
    it('should test redirect callback with various URL scenarios', async () => {
      const testCases = [
        { params: { url: '/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' },
        { params: { url: 'https://example.com/dashboard', baseUrl: 'https://example.com' }, expected: 'https://example.com/dashboard' }
      ];

      testCases.forEach(async ({ params, expected }) => {
        const result = await testCallback(mockNextAuth, 'redirect', params);
        expect(result).toBe(expected);
      });
    });

    it('should test redirect callback with trusted domains in production', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      const result = await testCallback(mockNextAuth, 'redirect', {
        url: 'https://dnd-tracker-next-js.fly.dev/dashboard',
        baseUrl: 'https://example.com'
      });
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev/dashboard');
    });

    it('should test redirect callback blocking untrusted URLs', async () => {
      setupEnvironment({ NODE_ENV: 'production' });
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback(mockNextAuth, 'redirect', {
          url: 'https://malicious-site.com/dashboard',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });

    it('should test redirect callback error handling', async () => {
      withConsoleSpy(async _consoleSpy => {
        const result = await testCallback(mockNextAuth, 'redirect', {
          url: 'invalid-url-format',
          baseUrl: 'https://example.com'
        });
        expect(result).toBe('https://example.com');
      });
    });
  });
});
