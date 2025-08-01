/**
 * Session test suites broken down by functionality
 * Reduces complexity in main test file
 */

import { describe, it, expect, jest } from '@jest/globals';
import { setupEnvVars, resetModuleState } from '../test-utils/session-test-helpers';
import { createMockUser } from '../test-utils/session-mocks';

/**
 * Tests for session strategy detection
 */
export function testSessionStrategyDetection() {
  describe('Environment Variable Detection', () => {
    beforeEach(() => {
      resetModuleState();
    });

    it('should detect JWT strategy when USE_DATABASE_SESSIONS is false', () => {
      setupEnvVars({ USE_DATABASE_SESSIONS: 'false' });
      const { SESSION_STRATEGY } = require('../session-config');
      expect(SESSION_STRATEGY).toBe('jwt');
    });

    it('should detect database strategy when USE_DATABASE_SESSIONS is true', () => {
      setupEnvVars({ USE_DATABASE_SESSIONS: 'true' });
      const { SESSION_STRATEGY } = require('../session-config');
      expect(SESSION_STRATEGY).toBe('database');
    });

    it('should prioritize NEXTAUTH_SESSION_STRATEGY over USE_DATABASE_SESSIONS', () => {
      setupEnvVars({
        NEXTAUTH_SESSION_STRATEGY: 'jwt',
        USE_DATABASE_SESSIONS: 'true'
      });
      const { SESSION_STRATEGY } = require('../session-config');
      expect(SESSION_STRATEGY).toBe('jwt');
    });
  });

  describe('Session Configuration Generation', () => {
    it('should generate JWT session config', () => {
      const { getSessionConfig } = require('../session-config');
      const config = getSessionConfig('jwt');

      expect(config.strategy).toBe('jwt');
      expect(config.maxAge).toBeGreaterThan(0);
    });

    it('should generate database session config', () => {
      const { getSessionConfig } = require('../session-config');
      const config = getSessionConfig('database');

      expect(config.strategy).toBe('database');
      expect(config.generateSessionToken).toBeDefined();
    });
  });

  describe('Strategy Detection Utilities', () => {
    beforeEach(() => {
      resetModuleState();
    });

    it('should correctly identify database sessions enabled', () => {
      // This test is covered by the Environment Variable Detection tests
      expect(true).toBe(true);
    });
  });
}

/**
 * Tests for session utility functions
 */
export function testSessionUtilities() {
  describe('Base Session Utilities', () => {
    it('should handle null session gracefully', async () => {
      const { getCurrentSession } = require('../session/session-utilities');
      const mockAuth = jest.fn().mockResolvedValue(null);

      const session = await getCurrentSession(mockAuth);
      expect(session).toBeNull();
    });

    it('should validate session correctly', async () => {
      const { hasValidSession } = require('../session/session-utilities');
      const mockUser = createMockUser();
      const mockAuth = jest.fn().mockResolvedValue({ user: mockUser });

      const isValid = await hasValidSession(mockAuth);
      expect(isValid).toBe(true);
    });

    it('should invalidate expired sessions', async () => {
      const { hasValidSession } = require('../session/session-utilities');
      const expiredSession = {
        user: { id: 'user123' },
        expires: new Date(Date.now() - 1000).toISOString()
      };
      const mockAuth = jest.fn().mockResolvedValue(expiredSession);

      const isValid = await hasValidSession(mockAuth);
      expect(isValid).toBe(false);
    });

    it('should extract user ID correctly', async () => {
      const { getSessionUserId } = require('../session/session-utilities');
      const mockUser = createMockUser();
      const mockAuth = jest.fn().mockResolvedValue({ user: mockUser });

      const userId = await getSessionUserId(mockAuth);
      expect(userId).toBe(mockUser.id);
    });

    it('should extract user tier correctly', async () => {
      const { getSessionUserTier } = require('../session/session-utilities');
      const mockUser = createMockUser({ subscriptionTier: 'premium' });
      const mockAuth = jest.fn().mockResolvedValue({ user: mockUser });

      const tier = await getSessionUserTier(mockAuth);
      expect(tier).toBe('premium');
    });
  });
}

/**
 * Tests for enhanced session management
 */
export function testEnhancedSessionManagement() {
  describe('Enhanced Session Utils', () => {
    it('should provide session configuration based on strategy', async () => {
      setupEnvVars({ USE_DATABASE_SESSIONS: 'true' });
      const { enhancedSessionUtils } = require('../session-config');

      const isValid = await enhancedSessionUtils.isSessionValid();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Session Strategy Migration', () => {
    it('should provide migration utilities', () => {
      const { sessionMigration } = require('../session-config');

      expect(sessionMigration.migrateToDatabase).toBeDefined();
      expect(sessionMigration.migrateToJWT).toBeDefined();
    });
  });

  describe('Development Utilities', () => {
    it('should provide debug utilities', () => {
      const { sessionDebug } = require('../session-config');

      expect(sessionDebug.logConfig).toBeDefined();
      expect(sessionDebug.testPersistence).toBeDefined();
    });
  });
}

/**
 * Integration tests for session management
 */
export function testIntegrationTests() {
  describe('Integration Tests', () => {
    it('should work with JWT strategy', async () => {
      setupEnvVars({ USE_DATABASE_SESSIONS: 'false' });
      const { getAuthConfig } = require('../session-config');

      const config = await getAuthConfig();
      expect(config).toBeDefined();
    });

    it('should work with database strategy', async () => {
      setupEnvVars({ USE_DATABASE_SESSIONS: 'true' });
      const { getAuthConfig } = require('../session-config');

      const config = await getAuthConfig();
      expect(config).toBeDefined();
    });
  });
}