/**
 * Comprehensive tests for auth-callbacks.ts (Issue #524)
 * Tests all authentication callback functions for both JWT and database session strategies
 */

import {
  enhancedSessionCallback,
  jwtCallback,
  redirectCallback,
  authorizeCredentials,
  authEventHandlers,
} from '../auth-callbacks';
import { UserService } from '../../services/UserService';
import { TRUSTED_DOMAINS } from '../../constants/session-constants';

// Mock UserService
jest.mock('../../services/UserService');
const MockedUserService = UserService as jest.Mocked<typeof UserService>;

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Auth Callbacks (Issue #524)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('enhancedSessionCallback', () => {
    test('should enhance session with user data', async () => {
      const session = {
        user: {
          email: 'test@example.com',
        },
      };
      const user = {
        id: 'user123',
        name: 'Test User',
        subscriptionTier: 'premium',
      };

      const result = await enhancedSessionCallback({ session, user });

      expect(result).toEqual({
        user: {
          email: 'test@example.com',
          id: 'user123',
          name: 'Test User',
          subscriptionTier: 'premium',
        },
      });
    });

    test('should return session as-is when no session.user', async () => {
      const session = {};
      const user = { id: 'user123' };

      const result = await enhancedSessionCallback({ session, user });

      expect(result).toEqual({});
    });

    test('should handle missing user data gracefully', async () => {
      const session = {
        user: {
          email: 'test@example.com',
        },
      };

      const result = await enhancedSessionCallback({ session, user: null });

      expect(result).toEqual(session);
    });

    test('should preserve existing user name when user has no name', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Existing Name',
        },
      };
      const user = {
        id: 'user123',
        subscriptionTier: 'free',
      };

      const result = await enhancedSessionCallback({ session, user });

      expect(result?.user?.name).toBe('Existing Name');
    });

    test('should default subscription tier to free', async () => {
      const session = {
        user: {
          email: 'test@example.com',
        },
      };
      const user = {
        id: 'user123',
        name: 'Test User',
      };

      const result = await enhancedSessionCallback({ session, user });

      expect(result?.user?.subscriptionTier).toBe('free');
    });

    test('should handle errors and return null', async () => {
      const user = {
        id: 'user123',
        get subscriptionTier() {
          throw new Error('Test error');
        }
      };
      const session = {
        user: {
          email: 'test@example.com',
        },
      };

      const result = await enhancedSessionCallback({ session, user });

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Database session callback error:',
        expect.any(Error)
      );
    });
  });

  describe('jwtCallback', () => {
    test('should add user data to JWT token', async () => {
      const token = { email: 'test@example.com' };
      const user = {
        id: 'user123',
        subscriptionTier: 'premium',
      };

      const result = await jwtCallback({ token, user });

      expect(result).toEqual({
        email: 'test@example.com',
        id: 'user123',
        subscriptionTier: 'premium',
      });
    });

    test('should return token unchanged when no user', async () => {
      const token = { email: 'test@example.com' };

      const result = await jwtCallback({ token, user: null });

      expect(result).toEqual(token);
    });
  });

  describe('redirectCallback', () => {
    const baseUrl = 'https://example.com';

    test('should handle relative URLs by prepending baseUrl', async () => {
      const url = '/dashboard';

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe('https://example.com/dashboard');
    });

    test('should allow trusted domain URLs', async () => {
      const url = `https://${TRUSTED_DOMAINS[0]}/callback`;

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(url);
    });

    test('should reject untrusted domains and return baseUrl', async () => {
      const url = 'https://malicious.com/callback';

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(baseUrl);
    });

    test('should handle invalid URLs and return baseUrl', async () => {
      const url = 'not-a-valid-url';

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(baseUrl);
    });
  });

  describe('authorizeCredentials', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      subscriptionTier: 'premium',
    };

    test('should authenticate valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: 'true',
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser, requiresVerification: false },
      } as any);

      const result = await authorizeCredentials(credentials);

      expect(MockedUserService.authenticateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium',
      });
    });

    test('should return null for missing email', async () => {
      const credentials = {
        password: 'password123',
      };

      const result = await authorizeCredentials(credentials);

      expect(result).toBeNull();
      expect(MockedUserService.authenticateUser).not.toHaveBeenCalled();
    });

    test('should return null for missing password', async () => {
      const credentials = {
        email: 'test@example.com',
      };

      const result = await authorizeCredentials(credentials);

      expect(result).toBeNull();
      expect(MockedUserService.authenticateUser).not.toHaveBeenCalled();
    });

    test('should return null when authentication fails', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: false,
        data: null,
      } as any);

      const result = await authorizeCredentials(credentials);

      expect(result).toBeNull();
    });

    test('should handle authentication errors', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      MockedUserService.authenticateUser.mockRejectedValue(new Error('DB Error'));

      const result = await authorizeCredentials(credentials);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Authentication error:',
        expect.any(Error)
      );
    });
  });

  describe('authEventHandlers', () => {
    test('should handle signIn event', async () => {
      const user = { email: 'test@example.com' };

      await authEventHandlers.signIn({ user });

      expect(mockConsoleLog).toHaveBeenCalledWith('User signed in:', 'test@example.com');
    });

    test('should handle signIn event with no user', async () => {
      await authEventHandlers.signIn({ user: null });

      expect(mockConsoleLog).toHaveBeenCalledWith('User signed in:', undefined);
    });

    test('should handle signOut event', async () => {
      await authEventHandlers.signOut();

      expect(mockConsoleLog).toHaveBeenCalledWith('User signed out');
    });
  });
});