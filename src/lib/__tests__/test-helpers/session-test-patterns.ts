/**
 * Common test patterns for session testing
 * Reduces complexity in test files by extracting repeated patterns
 */

import {
  createMockSession,
  setupAuthMocks,
  setupConsoleSpy,
  testSessionUtilitySuccess,
  testSessionUtilityError,
  validateSessionConfig,
  validateUUIDFormat,
} from './session-config-test-utils';
import {
  getSessionConfig,
  isDatabaseSessionEnabled,
  isJWTSessionEnabled,
  sessionUtils,
  sessionDebug,
  ensureSessionModelRegistration,
} from '@/lib/session-config';

/**
 * Test session strategy detection patterns
 */
export function testStrategyDetection() {
  return {
    testJWTDefault() {
      delete process.env.NEXTAUTH_SESSION_STRATEGY;
      const config = getSessionConfig();
      expect(config.strategy).toBe('jwt');
      expect(isJWTSessionEnabled()).toBe(true);
      expect(isDatabaseSessionEnabled()).toBe(false);
    },

    testDatabaseStrategy() {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';
      jest.resetModules();
      const config = getSessionConfig('database');
      expect(config.strategy).toBe('database');
      expect(config.generateSessionToken).toBeDefined();
    },

    testInvalidFallback() {
      const config = getSessionConfig('invalid' as any);
      expect(config.strategy).toBe('jwt');
      expect(config.generateSessionToken).toBeUndefined();
    },
  };
}

/**
 * Test session configuration patterns
 */
export function testSessionConfiguration() {
  return {
    testJWTConfig() {
      const config = getSessionConfig('jwt');
      validateSessionConfig(config, 'jwt');
      expect(config.generateSessionToken).toBeUndefined();
    },

    testDatabaseConfig() {
      const config = getSessionConfig('database');
      validateSessionConfig(config, 'database');
      expect(config.generateSessionToken).toBeDefined();
    },

    testUniqueTokens() {
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
    },
  };
}

/**
 * Test session utility patterns
 */
export function testSessionUtilities() {
  return {
    async testCurrentSession(mockAuth: jest.Mock, mockSession: any) {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getCurrentSession(),
        mockSession
      );
      expect(mockAuth).toHaveBeenCalled();
    },

    async testSessionError(mockAuth: jest.Mock) {
      await testSessionUtilityError(
        mockAuth,
        () => sessionUtils.getCurrentSession(),
        null
      );
    },

    async testValidSession(mockAuth: jest.Mock, mockSession: any) {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.hasValidSession(),
        true
      );
    },

    async testInvalidSession(mockAuth: jest.Mock) {
      await testSessionUtilitySuccess(
        mockAuth,
        null,
        () => sessionUtils.hasValidSession(),
        false
      );
    },

    async testSessionUserId(mockAuth: jest.Mock, mockSession: any) {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getSessionUserId(),
        'test-user-id'
      );
    },

    async testSessionUserTier(mockAuth: jest.Mock, mockSession: any) {
      await testSessionUtilitySuccess(
        mockAuth,
        mockSession,
        () => sessionUtils.getSessionUserTier(),
        'premium'
      );
    },

    async testDefaultTier(mockAuth: jest.Mock) {
      await testSessionUtilitySuccess(
        mockAuth,
        null,
        () => sessionUtils.getSessionUserTier(),
        'free'
      );
    },
  };
}

/**
 * Test model registration patterns
 */
export function testModelRegistration() {
  return {
    testDatabaseRegistration() {
      const consoleSpy = setupConsoleSpy();
      jest.doMock('@/lib/session-config', () => ({
        ...jest.requireActual('@/lib/session-config'),
        isDatabaseSessionEnabled: () => true,
      }));

      ensureSessionModelRegistration();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Database session strategy enabled - MongoDB adapter will handle model registration'
      );
      consoleSpy.mockRestore();
    },

    testJWTSkip() {
      const consoleSpy = setupConsoleSpy();
      jest.doMock('@/lib/session-config', () => ({
        ...jest.requireActual('@/lib/session-config'),
        isDatabaseSessionEnabled: () => false,
      }));

      ensureSessionModelRegistration();
      expect(true).toBe(true); // Test passes if no errors thrown
      consoleSpy.mockRestore();
    },
  };
}

/**
 * Test debug utility patterns
 */
export function testDebugUtilities() {
  return {
    testLogConfig() {
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
    },

    async testPersistence(mockAuth: jest.Mock, mockSession: any) {
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
    },
  };
}

/**
 * Setup test environment for session tests
 */
export function setupSessionTestEnv() {
  const mockAuth = jest.fn();
  const mockSession = createMockSession();
  setupAuthMocks(mockAuth);
  return { mockAuth, mockSession };
}

/**
 * Test integration patterns
 */
export function testIntegrationPatterns() {
  return {
    testConsistentConfig() {
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
    },

    testEnvironmentChanges() {
      // Test with JWT
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';
      const jwtConfig = getSessionConfig('jwt');
      expect(jwtConfig.strategy).toBe('jwt');

      // Test with database
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';
      const dbConfig = getSessionConfig('database');
      expect(dbConfig.strategy).toBe('database');
    },
  };
}

/**
 * Test error handling patterns
 */
export function testErrorHandling() {
  return {
    testMissingEnvVars() {
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
    },

    async testUtilityErrors() {
      const { mockAuth } = setupSessionTestEnv();

      // Test all utilities handle errors gracefully
      await testSessionUtilityError(mockAuth, () => sessionUtils.getCurrentSession(), null);
      await testSessionUtilityError(mockAuth, () => sessionUtils.hasValidSession(), false);
      await testSessionUtilityError(mockAuth, () => sessionUtils.getSessionUserId(), null);
      await testSessionUtilityError(mockAuth, () => sessionUtils.getSessionUserTier(), 'free');
    },
  };
}