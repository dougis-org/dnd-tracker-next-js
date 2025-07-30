/**
 * Additional coverage tests for session-config.ts (Issue #524)
 * Specifically targeting uncovered lines 98-123 to achieve 70%+ coverage
 */

// Tests for session-config.ts coverage

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

jest.mock('../session/session-utilities', () => ({
  getCurrentSession: jest.fn(),
  hasValidSession: jest.fn(),
  getSessionUserId: jest.fn(),
  getSessionUserTier: jest.fn(),
}));

// Import mocked utilities
import {
  getCurrentSession as mockBaseGetCurrentSession,
  hasValidSession as mockBaseHasValidSession,
  getSessionUserId as mockBaseGetSessionUserId,
  getSessionUserTier as mockBaseGetSessionUserTier,
} from '../session/session-utilities';

describe('Session Config Coverage Tests (Issue #524)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sessionUtils integration tests', () => {
    test('should call getCurrentSession with JWT auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      const mockSession = { user: { id: 'user123' } };
      (mockBaseGetCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getCurrentSession();

        expect(mockBaseGetCurrentSession).toHaveBeenCalledWith('jwt-auth');
        expect(result).toEqual(mockSession);
      });
    });

    test('should call getCurrentSession with database auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      const mockSession = { user: { id: 'user123' } };
      (mockBaseGetCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getCurrentSession();

        expect(mockBaseGetCurrentSession).toHaveBeenCalledWith('db-auth');
        expect(result).toEqual(mockSession);
      });
    });

    test('should call hasValidSession with JWT auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      (mockBaseHasValidSession as jest.Mock).mockResolvedValue(true);

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.hasValidSession();

        expect(mockBaseHasValidSession).toHaveBeenCalledWith('jwt-auth');
        expect(result).toBe(true);
      });
    });

    test('should call hasValidSession with database auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      (mockBaseHasValidSession as jest.Mock).mockResolvedValue(false);

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.hasValidSession();

        expect(mockBaseHasValidSession).toHaveBeenCalledWith('db-auth');
        expect(result).toBe(false);
      });
    });

    test('should call getSessionUserId with JWT auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      (mockBaseGetSessionUserId as jest.Mock).mockResolvedValue('user123');

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getSessionUserId();

        expect(mockBaseGetSessionUserId).toHaveBeenCalledWith('jwt-auth');
        expect(result).toBe('user123');
      });
    });

    test('should call getSessionUserId with database auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      (mockBaseGetSessionUserId as jest.Mock).mockResolvedValue(null);

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getSessionUserId();

        expect(mockBaseGetSessionUserId).toHaveBeenCalledWith('db-auth');
        expect(result).toBeNull();
      });
    });

    test('should call getSessionUserTier with JWT auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      (mockBaseGetSessionUserTier as jest.Mock).mockResolvedValue('premium');

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getSessionUserTier();

        expect(mockBaseGetSessionUserTier).toHaveBeenCalledWith('jwt-auth');
        expect(result).toBe('premium');
      });
    });

    test('should call getSessionUserTier with database auth', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      (mockBaseGetSessionUserTier as jest.Mock).mockResolvedValue('free');

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');
        const result = await sessionUtils.getSessionUserTier();

        expect(mockBaseGetSessionUserTier).toHaveBeenCalledWith('db-auth');
        expect(result).toBe('free');
      });
    });

    test('should handle errors in sessionUtils functions', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'jwt';

      (mockBaseGetCurrentSession as jest.Mock).mockRejectedValue(new Error('Test error'));
      (mockBaseHasValidSession as jest.Mock).mockRejectedValue(new Error('Test error'));
      (mockBaseGetSessionUserId as jest.Mock).mockRejectedValue(new Error('Test error'));
      (mockBaseGetSessionUserTier as jest.Mock).mockRejectedValue(new Error('Test error'));

      jest.isolateModules(async () => {
        const { sessionUtils } = require('../session-config');

        // These should not throw, errors should be handled in the base functions
        await expect(sessionUtils.getCurrentSession()).rejects.toThrow('Test error');
        await expect(sessionUtils.hasValidSession()).rejects.toThrow('Test error');
        await expect(sessionUtils.getSessionUserId()).rejects.toThrow('Test error');
        await expect(sessionUtils.getSessionUserTier()).rejects.toThrow('Test error');
      });
    });
  });

  describe('Dynamic auth config loading', () => {
    test('should dynamically load JWT auth config', async () => {
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

    test('should dynamically load database auth config', async () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'database';

      jest.isolateModules(async () => {
        const { getAuthConfig } = require('../session-config');
        const config = await getAuthConfig();

        expect(config.handlers).toBe('db-handlers');
        expect(config.auth).toBe('db-auth');
        expect(config.signIn).toBe('db-signIn');
        expect(config.signOut).toBe('db-signOut');
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle mixed case environment values', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = 'DATABASE';

      jest.isolateModules(() => {
        const { SESSION_STRATEGY } = require('../session-config');
        // Type assertion allows any string, so 'DATABASE' is accepted as-is
        expect(SESSION_STRATEGY).toBe('DATABASE');
      });
    });

    test('should handle whitespace in environment values', () => {
      process.env.NEXTAUTH_SESSION_STRATEGY = ' jwt ';

      jest.isolateModules(() => {
        const { SESSION_STRATEGY } = require('../session-config');
        // Type assertion allows any string, so ' jwt ' is accepted as-is
        expect(SESSION_STRATEGY).toBe(' jwt ');
      });
    });
  });
});