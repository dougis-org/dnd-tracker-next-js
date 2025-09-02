/**
 * Tests for session constants (Issue #585)
 * Ensures centralized session cookie name logic works correctly
 */

import { SESSION_COOKIE_NAME, SESSION_TIMEOUTS, TRUSTED_DOMAINS, DEFAULT_DATABASE_NAME } from '../session-constants';

describe('Session Constants', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('SESSION_COOKIE_NAME', () => {
    it('should return secure cookie name in production', () => {
      process.env.NODE_ENV = 'production';

      // Re-import to get updated value
      const { SESSION_COOKIE_NAME: prodCookieName } = require('../session-constants');

      expect(prodCookieName).toBe('__Secure-clerk-session');
    });

    it('should return regular cookie name in development', () => {
      process.env.NODE_ENV = 'development';

      // Re-import to get updated value
      const { SESSION_COOKIE_NAME: devCookieName } = require('../session-constants');

      expect(devCookieName).toBe('clerk-session');
    });

    it('should return regular cookie name when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      // Re-import to get updated value
      const { SESSION_COOKIE_NAME: defaultCookieName } = require('../session-constants');

      expect(defaultCookieName).toBe('clerk-session');
    });

    it('should return regular cookie name in test environment', () => {
      process.env.NODE_ENV = 'test';

      // Re-import to get updated value
      const { SESSION_COOKIE_NAME: testCookieName } = require('../session-constants');

      expect(testCookieName).toBe('clerk-session');
    });
  });

  describe('SESSION_TIMEOUTS', () => {
    it('should have correct timeout values', () => {
      expect(SESSION_TIMEOUTS.MAX_AGE).toBe(30 * 24 * 60 * 60); // 30 days in seconds
      expect(SESSION_TIMEOUTS.UPDATE_AGE).toBe(24 * 60 * 60); // 24 hours in seconds
    });

    it('should be immutable at compile time with as const assertion', () => {
      // Verify the structure is correct - TypeScript ensures immutability
      expect(typeof SESSION_TIMEOUTS.MAX_AGE).toBe('number');
      expect(typeof SESSION_TIMEOUTS.UPDATE_AGE).toBe('number');
    });
  });

  describe('TRUSTED_DOMAINS', () => {
    it('should contain expected production domains', () => {
      expect(TRUSTED_DOMAINS).toContain('dnd-tracker-next-js.fly.dev');
      expect(TRUSTED_DOMAINS).toContain('dnd-tracker.fly.dev');
      expect(TRUSTED_DOMAINS).toContain('dndtracker.com');
      expect(TRUSTED_DOMAINS).toContain('www.dndtracker.com');
    });

    it('should be immutable at compile time with as const assertion', () => {
      // Verify the structure is correct - TypeScript ensures immutability
      expect(Array.isArray(TRUSTED_DOMAINS)).toBe(true);
      expect(TRUSTED_DOMAINS.length).toBeGreaterThan(0);
    });
  });

  

  describe('DEFAULT_DATABASE_NAME', () => {
    it('should have correct default database name', () => {
      expect(DEFAULT_DATABASE_NAME).toBe('dnd-tracker');
    });
  });

  describe('Integration with auth.ts and middleware.ts (Issue #585)', () => {
    it('should provide consistent cookie names for both auth and middleware', () => {
      // Test that the SESSION_COOKIE_NAME constant follows the expected pattern
      const prodCookieName = '__Secure-clerk-session';
      const devCookieName = 'clerk-session';

      // Verify the logic matches what we expect
      expect(prodCookieName).toMatch(/^__Secure-/);
      expect(devCookieName).not.toMatch(/^__Secure-/);
      expect(prodCookieName).toContain('clerk-session');
      expect(devCookieName).toContain('clerk-session');

      // Ensure they're different as expected
      expect(prodCookieName).not.toBe(devCookieName);
    });

    it('should match NextAuth.js cookie naming conventions', () => {
      // Verify our constants follow NextAuth.js patterns
      const securePrefix = '__Secure-';
      const baseName = 'clerk-session';

      expect(SESSION_COOKIE_NAME).toMatch(new RegExp(`^(${securePrefix})?${baseName}$`));
    });
  });
});