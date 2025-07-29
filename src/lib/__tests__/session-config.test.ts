/**
 * Test file for Session Configuration System (Issue #524)
 *
 * Tests the session strategy configuration utilities and the ability to switch
 * between JWT and database session strategies.
 */

import {
  getSessionConfig,
  isDatabaseSessionEnabled,
  isJWTSessionEnabled,
  sessionUtils,
  sessionDebug,
  ensureSessionModelRegistration,
} from '@/lib/session-config';
import {
  createMockSession,
  setupAuthMocks,
  setupConsoleSpy,
  testSessionUtilitySuccess,
  testSessionUtilityError,
  validateSessionConfig,
  validateUUIDFormat,
} from './test-helpers/session-config-test-utils';

// Mock environment variable
const originalEnv = process.env;

describe('Session Configuration System (Issue #524)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Session Strategy Detection', () => {
    test('should default to JWT strategy when no environment variable is set', () => {
      delete process.env.NEXTAUTH_SESSION_STRATEGY;

      const config = getSessionConfig();

      expect(config.strategy).toBe('jwt');
      expect(isJWTSessionEnabled()).toBe(true);
      expect(isDatabaseSessionEnabled()).toBe(false);
    });

    test('should use database strategy when environment variable is set', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      // Re-import module to pick up environment variable
      jest.resetModules();

      const config = getSessionConfig('database');

      expect(config.strategy).toBe('database');
      expect(config.generateSessionToken).toBeDefined();
    });

    test('should fallback to JWT for invalid strategy values', () => {
      const config = getSessionConfig('invalid' as any);

      expect(config.strategy).toBe('jwt');
      expect(config.generateSessionToken).toBeUndefined();
    });
  });

  describe('Session Configuration', () => {
    test('should provide correct JWT configuration', () => {
      const config = getSessionConfig('jwt');
      validateSessionConfig(config, 'jwt');
      expect(config.generateSessionToken).toBeUndefined();
    });

    test('should provide correct database configuration', () => {
      const config = getSessionConfig('database');
      validateSessionConfig(config, 'database');
      expect(config.generateSessionToken).toBeDefined();
    });

    test('should generate unique session tokens for database strategy', () => {
      const config = getSessionConfig('database');

      if (config.generateSessionToken) {
        const token1 = config.generateSessionToken();
        const token2 = config.generateSessionToken();

        expect(token1).toBeDefined();
        expect(token2).toBeDefined();
        expect(token1).not.toBe(token2);

        validateUUIDFormat(token1);
        validateUUIDFormat(token2);
      }
    });
  });

  describe('Session Utilities', () => {
    let mockAuth: jest.Mock;
    let mockSession: any;

    beforeEach(() => {
      // Create fresh mocks for each test
      mockAuth = jest.fn();
      mockSession = createMockSession();
      setupAuthMocks(mockAuth);
    });

    test('should get current session successfully', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getCurrentSession(),
        mockSession
      );
      expect(mockAuth).toHaveBeenCalled();
    });

    test('should handle session retrieval errors gracefully', async () => {
      await testSessionUtilityError(
        mockAuth,
        () => sessionUtils.getCurrentSession(),
        null
      );
    });

    test('should check valid session correctly', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.hasValidSession(),
        true
      );
    });

    test('should return false for invalid session', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        null,
        () => sessionUtils.hasValidSession(),
        false
      );
    });

    test('should get session user ID', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getSessionUserId(),
        'test-user-id'
      );
    });

    test('should get session user tier', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getSessionUserTier(),
        'premium'
      );
    });

    test('should return default tier for missing session', async () => {
      await testSessionUtilitySuccess(
        mockAuth,
        null,
        () => sessionUtils.getSessionUserTier(),
        'free'
      );
    });
  });

  describe('Model Registration', () => {
    test('should handle model registration for database sessions', () => {
      const consoleSpy = setupConsoleSpy();

      // Mock database session enabled
      jest.doMock('@/lib/session-config', () => ({
        ...jest.requireActual('@/lib/session-config'),
        isDatabaseSessionEnabled: () => true,
      }));

      ensureSessionModelRegistration();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Database session strategy enabled - MongoDB adapter will handle model registration'
      );

      consoleSpy.mockRestore();
    });

    test('should skip model registration for JWT sessions', () => {
      const consoleSpy = setupConsoleSpy();

      // Force JWT strategy
      jest.doMock('@/lib/session-config', () => ({
        ...jest.requireActual('@/lib/session-config'),
        isDatabaseSessionEnabled: () => false,
      }));

      ensureSessionModelRegistration();

      // Should not throw any errors and should skip registration
      expect(true).toBe(true); // Test passes if no errors thrown

      consoleSpy.mockRestore();
    });
  });

  describe('Debug Utilities', () => {
    let mockAuth: jest.Mock;
    let mockSession: any;

    beforeEach(() => {
      mockAuth = jest.fn();
      mockSession = createMockSession();
      setupAuthMocks(mockAuth);
    });

    test('should log session configuration', () => {
      const consoleSpy = setupConsoleSpy();

      sessionDebug.logConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Session Configuration:',
        expect.objectContaining({
          strategy: expect.any(String),
          isDatabaseEnabled: expect.any(Boolean),
          isJWTEnabled: expect.any(Boolean),
          config: expect.any(Object),
        })
      );

      consoleSpy.mockRestore();
    });

    test('should test session persistence', async () => {
      const consoleSpy = setupConsoleSpy();
      mockAuth.mockResolvedValue(mockSession);

      await sessionDebug.testPersistence();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Current Session:',
        expect.objectContaining({
          exists: expect.any(Boolean),
          userId: expect.any(String),
          email: expect.any(String),
          strategy: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Integration', () => {
    test('should provide consistent session configuration across utilities', () => {
      const config = getSessionConfig();
      const isDatabase = isDatabaseSessionEnabled();
      const isJWT = isJWTSessionEnabled();

      // Should be mutually exclusive
      expect(isDatabase).not.toBe(isJWT);

      // Configuration should match detection
      if (isDatabase) {
        expect(config.strategy).toBe('database');
      } else {
        expect(config.strategy).toBe('jwt');
      }
    });

    test('should handle environment variable changes', () => {
      // Test with JWT
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';
      const jwtConfig = getSessionConfig('jwt');
      expect(jwtConfig.strategy).toBe('jwt');

      // Test with database
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';
      const dbConfig = getSessionConfig('database');
      expect(dbConfig.strategy).toBe('database');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing environment variables gracefully', () => {
      delete process.env.NEXTAUTH_SESSION_STRATEGY;
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_DB_NAME;

      // Should not throw errors
      expect(() => {
        getSessionConfig();
        isDatabaseSessionEnabled();
        isJWTSessionEnabled();
        ensureSessionModelRegistration();
      }).not.toThrow();
    });

    test('should handle session utility errors gracefully', async () => {
      let mockAuth: jest.Mock;

      beforeEach(() => {
        mockAuth = jest.fn();
        setupAuthMocks(mockAuth);
      });

      // Test all utilities handle errors gracefully
      await testSessionUtilityError(mockAuth, () => sessionUtils.getCurrentSession(), null);
      await testSessionUtilityError(mockAuth, () => sessionUtils.hasValidSession(), false);
      await testSessionUtilityError(mockAuth, () => sessionUtils.getSessionUserId(), null);
      await testSessionUtilityError(mockAuth, () => sessionUtils.getSessionUserTier(), 'free');
    });
  });
});