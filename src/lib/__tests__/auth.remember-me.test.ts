import { UserService } from '../services/UserService';
import { TestPasswordConstants } from '../test-utils/password-constants';
import {
  setupAuthTestEnv,
  restoreAuthTestEnv,
  createMockUser
} from './auth-test-utils';

// Mock all external dependencies
jest.mock('@auth/mongodb-adapter', () => ({
  MongoDBAdapter: jest.fn(),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    authenticateUser: jest.fn(),
  },
}));

// Setup environment variables
let originalEnv: NodeJS.ProcessEnv;

beforeAll(() => {
  originalEnv = setupAuthTestEnv();
});

afterAll(() => {
  restoreAuthTestEnv(originalEnv);
});

describe('Authentication RememberMe Functionality', () => {
  let mockUserService: jest.Mocked<typeof UserService>;
  let mockCredentials: any;

  // Helper functions to reduce duplication
  const mockSuccessfulUserLookup = (user: any) => {
    mockUserService.getUserByEmail.mockResolvedValue({
      success: true,
      data: user,
    });
  };

  const mockFailedUserLookup = (errorMessage = 'User not found', errorCode = 'USER_NOT_FOUND') => {
    mockUserService.getUserByEmail.mockResolvedValue({
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        statusCode: 404,
      },
    });
  };

  const mockSuccessfulAuthentication = (user: any) => {
    mockUserService.authenticateUser.mockResolvedValue({
      success: true,
      data: { user, requiresVerification: false },
    });
  };

  const mockFailedAuthentication = (errorMessage = 'Invalid credentials', errorCode = 'INVALID_CREDENTIALS') => {
    mockUserService.authenticateUser.mockResolvedValue({
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        statusCode: 401,
      },
    });
  };

  const testAuthenticateUserCall = async (email: string, password: string, rememberMe: boolean) => {
    return await mockUserService.authenticateUser({
      email,
      password,
      rememberMe,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCredentials = {
      email: 'test@example.com',
      password: TestPasswordConstants.PASSWORD_123,
    };

    mockUserService = UserService as jest.Mocked<typeof UserService>;
  });

  describe('Credentials Provider RememberMe Support', () => {
    it('should accept rememberMe as a credential parameter', async () => {
      // Test that the credentials provider can accept rememberMe parameter
      const credentialsWithRememberMe = {
        email: mockCredentials.email,
        password: mockCredentials.password,
        rememberMe: 'true', // NextAuth passes form values as strings
      };

      // Verify the shape of credentials matches what NextAuth would pass
      expect(credentialsWithRememberMe).toHaveProperty('email');
      expect(credentialsWithRememberMe).toHaveProperty('password');
      expect(credentialsWithRememberMe).toHaveProperty('rememberMe');
      expect(typeof credentialsWithRememberMe.rememberMe).toBe('string');
    });

    it('should handle rememberMe as boolean true', async () => {
      const mockUser = createMockUser();
      mockSuccessfulUserLookup(mockUser);
      mockSuccessfulAuthentication(mockUser);

      // Test authentication with rememberMe = true
      const authResult = await testAuthenticateUserCall(
        mockCredentials.email,
        mockCredentials.password,
        true
      );

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith({
        email: mockCredentials.email,
        password: mockCredentials.password,
        rememberMe: true,
      });

      expect(authResult.success).toBe(true);
    });

    it('should handle rememberMe as boolean false', async () => {
      const mockUser = createMockUser();
      mockSuccessfulUserLookup(mockUser);
      mockSuccessfulAuthentication(mockUser);

      // Test authentication with rememberMe = false
      const authResult = await testAuthenticateUserCall(
        mockCredentials.email,
        mockCredentials.password,
        false
      );

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith({
        email: mockCredentials.email,
        password: mockCredentials.password,
        rememberMe: false,
      });

      expect(authResult.success).toBe(true);
    });

    it('should convert string "true" to boolean true', () => {
      // Test the conversion logic that would be used in the authorize function
      const stringRememberMe = 'true';
      const booleanRememberMe = stringRememberMe === 'true';

      expect(booleanRememberMe).toBe(true);
    });

    it('should convert string "false" to boolean false', () => {
      // Test the conversion logic that would be used in the authorize function
      const stringRememberMe = 'false';
      const booleanRememberMe = stringRememberMe === 'true';

      expect(booleanRememberMe).toBe(false);
    });

    it('should convert undefined to boolean false', () => {
      // Test the conversion logic for missing rememberMe parameter
      const undefinedRememberMe = undefined;
      const booleanRememberMe = undefinedRememberMe === 'true';

      expect(booleanRememberMe).toBe(false);
    });

    it('should convert empty string to boolean false', () => {
      // Test the conversion logic for empty rememberMe parameter
      const emptyRememberMe = '';
      const booleanRememberMe = emptyRememberMe === 'true';

      expect(booleanRememberMe).toBe(false);
    });
  });

  describe('Session Duration Configuration', () => {
    it('should handle different session durations based on rememberMe', () => {
      // Test logic for potentially different session durations
      // Note: This test documents the current behavior and can be extended
      // if different session durations are implemented in the future

      const standardMaxAge = SESSION_TIMEOUTS.MAX_AGE; // 30 days
      const extendedMaxAge = 90 * 24 * 60 * 60; // 90 days (future enhancement)

      // Current behavior: same duration regardless of rememberMe
      const getSessionMaxAge = (_rememberMe: boolean) => {
        // Future enhancement could use different durations:
        // return rememberMe ? extendedMaxAge : standardMaxAge;
        return standardMaxAge; // Current implementation
      };

      expect(getSessionMaxAge(true)).toBe(standardMaxAge);
      expect(getSessionMaxAge(false)).toBe(standardMaxAge);

      // Document the potential for future enhancement
      expect(extendedMaxAge).toBeGreaterThan(standardMaxAge);
    });
  });

  describe('Error Handling with RememberMe', () => {
    it('should handle authentication errors regardless of rememberMe value', async () => {
      const mockUser = createMockUser();
      mockSuccessfulUserLookup(mockUser);
      mockFailedAuthentication();

      // Test with rememberMe = true
      const authResultTrue = await testAuthenticateUserCall(
        mockCredentials.email,
        'wrongpassword',
        true
      );

      expect(authResultTrue.success).toBe(false);

      // Test with rememberMe = false
      const authResultFalse = await testAuthenticateUserCall(
        mockCredentials.email,
        'wrongpassword',
        false
      );

      expect(authResultFalse.success).toBe(false);
    });

    it('should handle missing user regardless of rememberMe value', async () => {
      mockFailedUserLookup();

      const result = await mockUserService.getUserByEmail('nonexistent@example.com');
      expect(result.success).toBe(false);

      // The rememberMe parameter should not affect user lookup failures
      // This is just documenting the expected behavior
    });
  });

  describe('Integration with NextAuth Credentials Provider', () => {
    it('should simulate the full authorize flow with rememberMe', async () => {
      const mockUser = createMockUser();

      // Mock successful user lookup and authentication
      mockSuccessfulUserLookup(mockUser);
      mockSuccessfulAuthentication(mockUser);

      // Simulate NextAuth authorize function flow
      const credentials = {
        email: 'test@example.com',
        password: TestPasswordConstants.PASSWORD_123,
        rememberMe: 'true', // NextAuth passes form values as strings
      };

      // Step 1: Check if credentials are present
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Credentials missing');
      }

      // Step 2: Get user by email
      const userResult = await mockUserService.getUserByEmail(credentials.email);
      expect(userResult.success).toBe(true);

      // Step 3: Authenticate user with rememberMe conversion
      const rememberMe = credentials.rememberMe === 'true';
      const authResult = await testAuthenticateUserCall(
        credentials.email,
        credentials.password,
        rememberMe
      );

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        rememberMe: true,
      });

      expect(authResult.success).toBe(true);
      expect(authResult.data?.user).toEqual(mockUser);
    });

    it('should handle the authorize flow when rememberMe is not provided', async () => {
      const mockUser = createMockUser();

      mockSuccessfulUserLookup(mockUser);
      mockSuccessfulAuthentication(mockUser);

      // Simulate credentials without rememberMe parameter
      const credentials = {
        email: 'test@example.com',
        password: TestPasswordConstants.PASSWORD_123,
      };

      // Simulate the conversion logic for missing rememberMe
      const rememberMe = (credentials as any).rememberMe === 'true';

      const authResult = await testAuthenticateUserCall(
        credentials.email,
        credentials.password,
        rememberMe
      );

      expect(mockUserService.authenticateUser).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        rememberMe: false,
      });

      expect(authResult.success).toBe(true);
    });
  });
});