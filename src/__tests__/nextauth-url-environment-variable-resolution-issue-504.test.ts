/**
 * @jest-environment jsdom
 *
 * Test suite for Issue #504: Fix NEXTAUTH_URL Environment Variable Resolution in Production
 *
 * Problem: In production, the application is generating invalid URLs with `0.0.0.0:3000`
 * instead of the correct Fly.io production domain.
 *
 * Root Cause: The NEXTAUTH_URL environment variable is not properly set or resolved in
 * production deployment, causing NextAuth to fall back to development defaults.
 *
 * Solution: Update validateNextAuthUrl() to provide production fallback and add runtime
 * environment variable validation.
 *
 * TDD Acceptance Criteria:
 * 1. validateNextAuthUrl() should provide production fallback when NEXTAUTH_URL is missing
 * 2. validateNextAuthUrl() should reject 0.0.0.0:3000 URLs in production
 * 3. Runtime environment validation should detect missing NEXTAUTH_URL in production
 * 4. Production domain fallback should be used when NEXTAUTH_URL is invalid
 */

import { validateNextAuthUrl } from '../lib/auth';

describe('Issue #504: NEXTAUTH_URL Environment Variable Resolution', () => {
  // Store original env for restoration
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe('TDD: Production fallback functionality (will initially fail)', () => {
    it('should provide production domain fallback when NEXTAUTH_URL is missing in production', () => {
      // Setup production environment without NEXTAUTH_URL
      process.env.NODE_ENV = 'production';
      delete process.env.NEXTAUTH_URL;

      // This will initially fail because validateNextAuthUrl doesn't have fallback logic
      const result = validateNextAuthUrl();

      // Should fallback to production domain instead of returning undefined
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
    });

    it('should provide production domain fallback when NEXTAUTH_URL is invalid 0.0.0.0 in production', () => {
      // Setup production environment with invalid URL that causes the issue
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_URL = 'http://0.0.0.0:3000';

      // This will initially fail because validateNextAuthUrl returns undefined for invalid URLs
      const result = validateNextAuthUrl();

      // Should fallback to production domain instead of returning undefined
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid NEXTAUTH_URL for production: http://0.0.0.0:3000'
        )
      );
    });

    it('should provide production domain fallback when NEXTAUTH_URL is empty string in production', () => {
      // Setup production environment with empty NEXTAUTH_URL
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_URL = '';

      // This will initially fail because validateNextAuthUrl returns undefined for empty strings
      const result = validateNextAuthUrl();

      // Should fallback to production domain instead of returning undefined
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
    });

    it('should respect valid NEXTAUTH_URL when properly set in production', () => {
      // Setup production environment with valid URL
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';

      const result = validateNextAuthUrl();

      // Should use the provided valid URL
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not provide fallback in development environment', () => {
      // Setup development environment without NEXTAUTH_URL
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_URL;

      const result = validateNextAuthUrl();

      // Should return undefined in development (existing behavior)
      expect(result).toBeUndefined();
    });

    it('should allow 0.0.0.0:3000 in development environment', () => {
      // Setup development environment with localhost URL
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_URL = 'http://0.0.0.0:3000';

      const result = validateNextAuthUrl();

      // Should allow development URLs in development
      expect(result).toBe('http://0.0.0.0:3000');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('TDD: Runtime environment validation (will initially fail)', () => {
    it('should validate production environment has proper NEXTAUTH_URL configuration', () => {
      // This will initially fail because we don't have runtime validation function
      expect(() => {
        // This function doesn't exist yet, will fail
        const { validateProductionEnvironment } = require('../lib/auth');

        process.env.NODE_ENV = 'production';
        delete process.env.NEXTAUTH_URL;

        validateProductionEnvironment();
      }).toThrow('NEXTAUTH_URL must be configured for production environment');
    });

    it('should validate production environment rejects invalid NEXTAUTH_URL', () => {
      // This will initially fail because we don't have runtime validation function
      expect(() => {
        const { validateProductionEnvironment } = require('../lib/auth');

        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_URL = 'http://0.0.0.0:3000';

        validateProductionEnvironment();
      }).toThrow(
        'NEXTAUTH_URL contains invalid production URL: http://0.0.0.0:3000'
      );
    });

    it('should pass validation when production environment has valid NEXTAUTH_URL', () => {
      // This will initially fail because we don't have runtime validation function
      const { validateProductionEnvironment } = require('../lib/auth');

      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';

      // Should not throw
      expect(() => validateProductionEnvironment()).not.toThrow();
    });
  });

  describe('Input parameter testing', () => {
    it('should handle explicit URL parameter with fallback logic', () => {
      process.env.NODE_ENV = 'production';

      // Test with explicit invalid URL parameter
      const result = validateNextAuthUrl('http://0.0.0.0:3000');

      // Should fallback to production domain when explicit URL is invalid in production
      expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
    });

    it('should handle explicit valid URL parameter', () => {
      process.env.NODE_ENV = 'production';

      // Test with explicit valid URL parameter
      const result = validateNextAuthUrl('https://custom-domain.com');

      // Should use the provided valid URL
      expect(result).toBe('https://custom-domain.com');
    });
  });

  describe('Regression prevention', () => {
    it('should never return 0.0.0.0:3000 URLs in production environment', () => {
      process.env.NODE_ENV = 'production';

      // Test various scenarios that could lead to 0.0.0.0 URLs
      const scenarios = [
        undefined,
        '',
        'http://0.0.0.0:3000',
        'https://0.0.0.0:3000',
        'http://localhost:3000',
      ];

      scenarios.forEach(testUrl => {
        process.env.NEXTAUTH_URL = testUrl;
        const result = validateNextAuthUrl();

        // Should never return a URL containing 0.0.0.0 in production
        expect(result).not.toContain('0.0.0.0');
        expect(result).not.toContain('localhost');

        // Should either be undefined (for development fallback) or production domain
        if (result) {
          expect(result).toBe('https://dnd-tracker-next-js.fly.dev');
        }
      });
    });
  });
});
