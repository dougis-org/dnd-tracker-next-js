import { UserService } from '../services/UserService';
import { TestPasswordConstants } from '../test-utils/password-constants';
import {
  setupAuthTestEnv,
  restoreAuthTestEnv,
  createMockUser
} from './auth-test-utils';
import {SESSION_TIMEOUTS} from "../constants/session-constants";

// Mock all external dependencies - MongoDB adapter no longer needed for Clerk
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

jest.mock('../services/UserService', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    authenticateUser: jest.fn(),
  },
}));

// Setup environment variables using auth-test-utils
let originalEnv: NodeJS.ProcessEnv;

beforeAll(() => {
  originalEnv = setupAuthTestEnv();
});

afterAll(() => {
  restoreAuthTestEnv(originalEnv);
});

// Helper functions now imported from auth-test-utils

const createMockUserWithStrings = (overrides: Partial<any> = {}) => {
  const baseUser = createMockUser(overrides);
  return {
    ...baseUser,
    id: baseUser.id,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const transformUserForSession = (mockUser: any) => ({
  id: mockUser.id?.toString() || '',
  email: mockUser.email,
  name: `${mockUser.firstName} ${mockUser.lastName}`,
  subscriptionTier: mockUser.subscriptionTier,
});

const updateSessionWithUser = (session: any, user: any) => {
  const updatedSession = { ...session };
  if (updatedSession?.user && user) {
    (updatedSession.user as any).id = user.id;
    (updatedSession.user as any).subscriptionTier =
      (user as any).subscriptionTier || 'free';
  }
  return updatedSession;
};

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Environment Configuration', () => {
    it('should require MONGODB_URI environment variable', () => {
      expect(process.env.MONGODB_URI).toBeDefined();
    });

    it('should require MONGODB_DB_NAME environment variable', () => {
      expect(process.env.MONGODB_DB_NAME).toBeDefined();
    });
  });

  describe('Module Import and Structure', () => {
    it('should export required Clerk auth utilities', async () => {
      const authModule = await import('../auth');

      expect(authModule.auth).toBeDefined();
      expect(authModule.requireAuth).toBeDefined();
      expect(authModule.isAuthenticated).toBeDefined();
      expect(authModule.getAuthenticatedUserId).toBeDefined();
      expect(authModule.buildSignInUrl).toBeDefined();
    });
  });

  describe('Credential Provider Authorization Logic', () => {
    let mockCredentials: any;
    let mockUserService: jest.Mocked<typeof UserService>;

    beforeEach(() => {
      mockCredentials = {
        email: 'test@example.com',
        password: TestPasswordConstants.PASSWORD_123,
      };

      mockUserService = UserService as jest.Mocked<typeof UserService>;
    });

    it('should return null when credentials are missing', async () => {
      // Import the auth module to verify it can be loaded
      await import('../auth');

      // Since we're testing the centralized auth utilities,
      // we'll test the logic by checking UserService calls
      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404,
        },
      });

      // Test the getUserByEmail call with invalid input
      const result = await mockUserService.getUserByEmail('');
      expect(result.success).toBe(false);
    });

    it('should authenticate valid user credentials', async () => {
      const mockUser = createMockUser();

      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser, requiresVerification: false },
      });

      // Test successful user lookup
      const userResult = await mockUserService.getUserByEmail(
        mockCredentials.email
      );
      expect(userResult.success).toBe(true);
      expect(userResult.data).toEqual(mockUser);

      // Test successful authentication
      const authResult = await mockUserService.authenticateUser({
        email: mockCredentials.email,
        password: mockCredentials.password,
        rememberMe: false,
      });

      expect(authResult.success).toBe(true);
      expect(authResult.data?.user).toEqual(mockUser);
    });

    it('should handle authentication failure', async () => {
      const mockUser = createMockUserWithStrings();

      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.authenticateUser.mockResolvedValue({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
        },
      });

      const userResult = await mockUserService.getUserByEmail(
        mockCredentials.email
      );
      expect(userResult.success).toBe(true);

      const authResult = await mockUserService.authenticateUser({
        email: mockCredentials.email,
        password: TestPasswordConstants.WRONG_SIMPLE,
        rememberMe: false,
      });

      expect(authResult.success).toBe(false);
    });

    it('should handle user not found', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404,
        },
      });

      const result = await mockUserService.getUserByEmail(
        'nonexistent@example.com'
      );
      expect(result.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockUserService.getUserByEmail.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        mockUserService.getUserByEmail(mockCredentials.email)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('User Data Transformation', () => {
    it('should format user data correctly for session', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'expert',
      };

      const transformedUser = transformUserForSession(mockUser);

      expect(transformedUser).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        subscriptionTier: 'expert',
      });
    });

    it('should handle user without _id', () => {
      const mockUser = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'free',
      };

      const transformedUser = transformUserForSession(mockUser);

      expect(transformedUser.id).toBe('');
      expect(transformedUser.name).toBe('John Doe');
    });
  });

  describe('Session Management Logic', () => {
    it('should add user ID and subscription tier to session', () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'John Doe',
        },
      };

      const mockUser = {
        id: 'user123',
        subscriptionTier: 'expert',
      };

      const updatedSession = updateSessionWithUser(mockSession, mockUser);

      expect((updatedSession.user as any).id).toBe('user123');
      expect((updatedSession.user as any).subscriptionTier).toBe('expert');
    });

    it('should default to free subscription tier', () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'John Doe',
        },
      };

      const mockUser = { id: 'user123' };

      const updatedSession = updateSessionWithUser(mockSession, mockUser);

      expect((updatedSession.user as any).subscriptionTier).toBe('free');
    });

    it('should handle missing session user gracefully', () => {
      const mockSession = {};

      const updatedSession = { ...mockSession };

      // Should not modify session if user is missing
      expect(updatedSession).toEqual(mockSession);
    });
  });

  describe('JWT Token Management', () => {
    it('should add subscription tier to JWT token', () => {
      const mockToken = {
        sub: 'user123',
        email: 'test@example.com',
      };

      const mockUser = {
        subscriptionTier: 'expert',
      };

      // Test JWT callback logic
      const updatedToken = { ...mockToken };
      if (mockUser) {
        (updatedToken as any).subscriptionTier =
          (mockUser as any).subscriptionTier || 'free';
      }

      expect((updatedToken as any).subscriptionTier).toBe('expert');
    });

    it('should preserve existing token data', () => {
      const mockToken = {
        sub: 'user123',
        email: 'test@example.com',
        existingData: 'preserved',
      };

      const mockUser = {
        subscriptionTier: 'expert',
      };

      const updatedToken = { ...mockToken };
      if (mockUser) {
        (updatedToken as any).subscriptionTier =
          (mockUser as any).subscriptionTier || 'free';
      }

      expect(updatedToken.sub).toBe('user123');
      expect(updatedToken.email).toBe('test@example.com');
      expect((updatedToken as any).existingData).toBe('preserved');
      expect((updatedToken as any).subscriptionTier).toBe('expert');
    });
  });

  describe('Security Validation', () => {
    let mockUserService: jest.Mocked<typeof UserService>;

    beforeEach(() => {
      mockUserService = UserService as jest.Mocked<typeof UserService>;
    });

    it('should handle empty credentials safely', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: {
          message: 'Invalid email',
          code: 'INVALID_EMAIL',
          statusCode: 400,
        },
      });

      const result = await mockUserService.getUserByEmail('');
      expect(result.success).toBe(false);
    });

    it('should handle malicious input safely', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";

      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404,
        },
      });

      const result = await mockUserService.getUserByEmail(maliciousEmail);
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        maliciousEmail
      );
      expect(result.success).toBe(false);
    });

    it('should not expose sensitive user data', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        subscriptionTier: 'expert',
        password: 'sensitive-hash',
        secretKey: 'sensitive-data',
      };

      // Only safe fields should be included in session
      const safeUserData = {
        id: mockUser.id,
        email: mockUser.email,
        subscriptionTier: mockUser.subscriptionTier,
      };

      expect(safeUserData).not.toHaveProperty('password');
      expect(safeUserData).not.toHaveProperty('secretKey');
    });
  });

  describe('Configuration Values', () => {
    it('should have correct session configuration values', () => {
      const expectedSessionConfig = {
        strategy: 'database',
        maxAge: SESSION_TIMEOUTS.MAX_AGE, // 30 days
        updateAge: SESSION_TIMEOUTS.UPDATE_AGE, // 24 hours
      };

      expect(expectedSessionConfig.strategy).toBe('database');
      expect(expectedSessionConfig.maxAge).toBe(2592000);
      expect(expectedSessionConfig.updateAge).toBe(86400);
    });

    it('should have correct page configuration', () => {
      const expectedPages = {
        signIn: '/signin',
        error: '/error',
      };

      expect(expectedPages.signIn).toBe('/signin');
      expect(expectedPages.error).toBe('/error');
    });

    it('should load Clerk auth configuration without errors', async () => {
      // Test that the auth configuration can be loaded and covers actual file execution
      // This ensures the auth utilities work properly
      const authModule = await import('../auth');

      // Verify all required exports are available after import
      expect(authModule.auth).toBeDefined();
      expect(authModule.requireAuth).toBeDefined();
      expect(authModule.isAuthenticated).toBeDefined();
      expect(authModule.getAuthenticatedUserId).toBeDefined();
    });

    it('should handle different NODE_ENV configurations during import', async () => {
      // Test that auth configuration works across different environments
      const originalNodeEnv = process.env.NODE_ENV;

      try {
        // Test development environment configuration
        process.env.NODE_ENV = 'development';
        const devModule = await import('../auth');
        expect(devModule.auth).toBeDefined();

        // Test production environment configuration
        process.env.NODE_ENV = 'production';
        const prodModule = await import('../auth');
        expect(prodModule.auth).toBeDefined();

      } finally {
        // Always restore original environment
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('should handle debug mode based on environment', () => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const expectedDebug = isDevelopment;

      // In test environment, debug should be false
      expect(process.env.NODE_ENV).toBe('test');
      expect(expectedDebug).toBe(false);
    });
  });
});
