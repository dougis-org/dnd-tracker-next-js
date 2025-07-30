/**
 * Advanced tests for session-config.ts (Issue #524)
 * Tests the enhanced session configuration utilities and functions
 */

import {
  getSessionConfig,
  sessionUtils,
  sessionMigration,
  sessionDebug,
} from '../session-config';

// Mock dependencies
jest.mock('../auth-database-session', () => ({
  handlers: 'db-handlers',
  auth: 'db-auth',
  signIn: 'db-signIn',
  signOut: 'db-signOut',
}));

jest.mock('../auth', () => ({
  handlers: 'jwt-handlers',
  auth: 'jwt-auth',
  signIn: 'jwt-signIn',
  signOut: 'jwt-signOut',
}));

jest.mock('../session/session-utilities');

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe('Session Config Advanced (Issue #524)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('getSessionConfig', () => {
    test('should return database config when database strategy specified', () => {
      const config = getSessionConfig('database');

      expect(config.strategy).toBe('database');
      expect(typeof config.generateSessionToken).toBe('function');
      expect(config.maxAge).toBeDefined();
      expect(config.updateAge).toBeDefined();
    });

    test('should return JWT config when JWT strategy specified', () => {
      const config = getSessionConfig('jwt');

      expect(config.strategy).toBe('jwt');
      expect(config.generateSessionToken).toBeUndefined();
      expect(config.maxAge).toBeDefined();
      expect(config.updateAge).toBeDefined();
    });

    test('should return JWT config for unknown strategy', () => {
      const config = getSessionConfig('unknown' as any);

      expect(config.strategy).toBe('jwt');
      expect(config.generateSessionToken).toBeUndefined();
    });

    test('should use environment strategy when no strategy provided', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      jest.isolateModules(() => {
        const { getSessionConfig } = require('../session-config');
        const config = getSessionConfig();

        expect(config.strategy).toBe('database');
      });
    });

    test('should generate session token for database strategy', () => {
      const config = getSessionConfig('database');
      const token = config.generateSessionToken?.();

      expect(typeof token).toBe('string');
      expect(token?.length).toBeGreaterThan(0);
    });
  });

  describe('Strategy Detection Functions', () => {
    test('should detect database session when enabled', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      jest.isolateModules(() => {
        const { isDatabaseSessionEnabled } = require('../session-config');
        expect(isDatabaseSessionEnabled()).toBe(true);
      });
    });

    test('should detect JWT session when enabled', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      jest.isolateModules(() => {
        const { isJWTSessionEnabled } = require('../session-config');
        expect(isJWTSessionEnabled()).toBe(true);
      });
    });

    test('should default to JWT when no strategy set', () => {
      delete process.env.NEXTAUTH_SESSION_STRATEGY;

      jest.isolateModules(() => {
        const { isJWTSessionEnabled, isDatabaseSessionEnabled } = require('../session-config');
        expect(isJWTSessionEnabled()).toBe(true);
        expect(isDatabaseSessionEnabled()).toBe(false);
      });
    });
  });

  describe('getAuthConfig', () => {
    test('should return database auth config when database enabled', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      // Re-import to get fresh environment
      jest.isolateModules(async () => {
        const { getAuthConfig } = require('../session-config');
        const config = await getAuthConfig();

        expect(config.handlers).toBe('db-handlers');
        expect(config.auth).toBe('db-auth');
        expect(config.signIn).toBe('db-signIn');
        expect(config.signOut).toBe('db-signOut');
      });
    });

    test('should return JWT auth config when JWT enabled', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      jest.isolateModules(async () => {
        const { getAuthConfig } = require('../session-config');
        const config = await getAuthConfig();

        expect(config.handlers).toBe('jwt-handlers');
        expect(config.auth).toBe('jwt-auth');
        expect(config.signIn).toBe('jwt-signIn');
        expect(config.signOut).toBe('jwt-signOut');
      });
    });
  });

  describe('sessionUtils', () => {
    test('should provide session utility functions', () => {
      expect(typeof sessionUtils.getCurrentSession).toBe('function');
      expect(typeof sessionUtils.hasValidSession).toBe('function');
      expect(typeof sessionUtils.getSessionUserId).toBe('function');
      expect(typeof sessionUtils.getSessionUserTier).toBe('function');
    });
  });

  describe('ensureSessionModelRegistration', () => {
    test('should log when database sessions enabled', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      jest.isolateModules(() => {
        const { ensureSessionModelRegistration } = require('../session-config');
        ensureSessionModelRegistration();

        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Database session strategy enabled - MongoDB adapter will handle model registration'
        );
      });
    });

    test('should not log when JWT sessions enabled', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      jest.isolateModules(() => {
        const { ensureSessionModelRegistration } = require('../session-config');
        ensureSessionModelRegistration();

        expect(mockConsoleLog).not.toHaveBeenCalled();
      });
    });
  });

  describe('sessionMigration', () => {
    test('should provide migration functions', () => {
      expect(typeof sessionMigration.migrateToDatabase).toBe('function');
      expect(typeof sessionMigration.migrateToJWT).toBe('function');
    });

    test('should log migration to database', async () => {
      await sessionMigration.migrateToDatabase();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Starting migration from JWT to database sessions...'
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Session migration requires application restart'
      );
    });

    test('should log migration to JWT', async () => {
      await sessionMigration.migrateToJWT();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Starting migration from database to JWT sessions...'
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Session migration requires application restart'
      );
    });
  });

  describe('sessionDebug', () => {
    test('should provide debug functions', () => {
      expect(typeof sessionDebug.logConfig).toBe('function');
      expect(typeof sessionDebug.testPersistence).toBe('function');
    });

    test('should log current configuration', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      jest.isolateModules(() => {
        const { sessionDebug } = require('../session-config');
        sessionDebug.logConfig();

        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Session Configuration:',
          expect.objectContaining({
            strategy: 'database',
            isDatabaseEnabled: true,
            isJWTEnabled: false,
            config: expect.objectContaining({
              strategy: 'database',
            }),
          })
        );
      });
    });

    test('should test session persistence', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      // Mock sessionUtils.getCurrentSession
      const { sessionUtils } = require('../session-config');
      sessionUtils.getCurrentSession = jest.fn().mockResolvedValue(mockSession);

      await sessionDebug.testPersistence();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Current Session:',
        expect.objectContaining({
          exists: true,
          userId: 'user123',
          email: 'test@example.com',
        })
      );
    });

    test('should handle null session in persistence test', async () => {
      const { sessionUtils } = require('../session-config');
      sessionUtils.getCurrentSession = jest.fn().mockResolvedValue(null);

      await sessionDebug.testPersistence();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Current Session:',
        expect.objectContaining({
          exists: false,
          userId: undefined,
          email: undefined,
        })
      );
    });
  });

  describe('Environment Variable Handling', () => {
    test('should handle various environment variable values', () => {
      const testValues = [
        { value: 'jwt', expected: 'jwt' },
        { value: 'database', expected: 'database' },
        { value: '', expected: 'jwt' },
        { value: undefined, expected: 'jwt' },
      ];

      testValues.forEach(({ value, expected }) => {
        delete process.env.NEXTAUTH_SESSION_STRATEGY;
        if (value !== undefined) {
          process.env.NEXTAUTH_SESSION_STRATEGY = value;
        }

        jest.isolateModules(() => {
          const { SESSION_STRATEGY } = require('../session-config');
          expect(SESSION_STRATEGY).toBe(expected);
        });
      });
    });
  });
});