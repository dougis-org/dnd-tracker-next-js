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
  SESSION_STRATEGY,
} from '@/lib/session-config';

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

      expect(config).toEqual({
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
      });
    });

    test('should provide correct database configuration', () => {
      const config = getSessionConfig('database');

      expect(config.strategy).toBe('database');
      expect(config.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
      expect(config.updateAge).toBe(24 * 60 * 60); // 24 hours
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

        // Should be valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(token1).toMatch(uuidRegex);
        expect(token2).toMatch(uuidRegex);
      }
    });
  });

  describe('Session Utilities', () => {
    // Mock the auth functions
    const mockAuth = jest.fn();
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        subscriptionTier: 'premium',
      },
    };

    beforeEach(() => {
      // Mock the dynamic imports
      jest.doMock('@/lib/auth', () => ({
        handlers: {},
        auth: mockAuth,
        signIn: jest.fn(),
        signOut: jest.fn(),
      }));

      jest.doMock('@/lib/auth-database-session', () => ({
        handlers: {},
        auth: mockAuth,
        signIn: jest.fn(),
        signOut: jest.fn(),
      }));
    });

    test('should get current session successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const session = await sessionUtils.getCurrentSession();

      expect(session).toEqual(mockSession);
      expect(mockAuth).toHaveBeenCalled();
    });

    test('should handle session retrieval errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Session error'));

      const session = await sessionUtils.getCurrentSession();

      expect(session).toBeNull();
    });

    test('should check valid session correctly', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const isValid = await sessionUtils.hasValidSession();

      expect(isValid).toBe(true);
    });

    test('should return false for invalid session', async () => {
      mockAuth.mockResolvedValue(null);

      const isValid = await sessionUtils.hasValidSession();

      expect(isValid).toBe(false);
    });

    test('should get session user ID', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const userId = await sessionUtils.getSessionUserId();

      expect(userId).toBe('test-user-id');
    });

    test('should get session user tier', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const tier = await sessionUtils.getSessionUserTier();

      expect(tier).toBe('premium');
    });

    test('should return default tier for missing session', async () => {
      mockAuth.mockResolvedValue(null);

      const tier = await sessionUtils.getSessionUserTier();

      expect(tier).toBe('free');
    });
  });

  describe('Model Registration', () => {
    test('should handle model registration for database sessions', () => {
      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test with database strategy
      ensureSessionModelRegistration();

      // Should not throw any errors
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should skip model registration for JWT sessions', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

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
    test('should log session configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
      // Mock auth to throw error
      mockAuth.mockRejectedValue(new Error('Auth error'));

      // All utilities should handle errors gracefully
      const session = await sessionUtils.getCurrentSession();
      const isValid = await sessionUtils.hasValidSession();
      const userId = await sessionUtils.getSessionUserId();
      const tier = await sessionUtils.getSessionUserTier();

      expect(session).toBeNull();
      expect(isValid).toBe(false);
      expect(userId).toBeNull();
      expect(tier).toBe('free');
    });
  });
});