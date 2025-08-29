/**
 * Tests for Issue #675 - Clerk Public Key Configuration for Build Process
 *
 * These tests verify that Clerk public key configuration is properly
 * accessible during build time and centrally managed.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Clerk Build Configuration - Issue #675', () => {
  const projectRoot = join(__dirname, '..', '..');

  describe('Configuration File Structure', () => {
    it('should have a centralized Clerk configuration file', () => {
      const configPath = join(projectRoot, 'src', 'lib', 'config', 'clerk.ts');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should export a function to get the publishable key', () => {
      const configPath = join(projectRoot, 'src', 'lib', 'config', 'clerk.ts');
      const content = readFileSync(configPath, 'utf-8');

      // Should export a function that gets the publishable key
      expect(content).toMatch(/export.*function.*getPublishableKey/);
      expect(content).toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
    });

    it('should provide build-time validation', () => {
      const configPath = join(projectRoot, 'src', 'lib', 'config', 'clerk.ts');
      const content = readFileSync(configPath, 'utf-8');

      // Should have validation for missing keys
      expect(content).toMatch(/throw.*Error|console\.error|console\.warn/);
    });
  });

  describe('Environment Variable Handling', () => {
    const originalEnv = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    afterEach(() => {
      if (originalEnv) {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      }
    });

    it('should handle missing publishable key gracefully during build', () => {
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      // Import the configuration
      const { getClerkPublishableKey } = require('../lib/config/clerk');

      // Should either return a fallback or throw a descriptive error
      expect(() => {
        const key = getClerkPublishableKey();
        // If it doesn't throw, it should return undefined or a fallback
        expect(typeof key === 'string' || key === undefined).toBe(true);
      }).not.toThrow();
    });

    it('should provide clear error messages for missing keys', () => {
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      const { validateClerkBuildConfig } = require('../lib/config/clerk');

      expect(() => {
        validateClerkBuildConfig();
      }).toThrow(/publishable.*key|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/i);
    });

    it('should work with valid publishable key', () => {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_123';

      const { getClerkPublishableKey } = require('../lib/config/clerk');
      const key = getClerkPublishableKey();

      expect(key).toBe('pk_test_valid_key_123');
    });
  });

  describe('Build-time Configuration', () => {
    it('should have proper Next.js configuration for Clerk', () => {
      const nextConfigPath = join(projectRoot, 'next.config.mjs');

      if (existsSync(nextConfigPath)) {
        const content = readFileSync(nextConfigPath, 'utf-8');

        // Should not have any configuration that prevents Clerk from working
        // This is more of a smoke test to ensure we don't break anything
        expect(content).not.toMatch(/CLERK.*false/);
      }
    });

    it('should provide fallback configuration for development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      const { getClerkPublishableKey, isDevelopmentMode } = require('../lib/config/clerk');

      expect(isDevelopmentMode()).toBe(true);

      // In development, we might allow undefined keys with warnings
      const key = getClerkPublishableKey();
      expect(typeof key === 'string' || key === undefined).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
      if (originalKey) {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalKey;
      }
    });
  });

  describe('Production Readiness', () => {
    it('should require publishable key in production builds', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      expect(() => {
        const { validateClerkBuildConfig } = require('../lib/config/clerk');
        validateClerkBuildConfig();
      }).toThrow();

      process.env.NODE_ENV = originalNodeEnv;
      if (originalKey) {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalKey;
      }
    });

    it('should validate publishable key format', () => {
      const { isValidPublishableKey } = require('../lib/config/clerk');

      expect(isValidPublishableKey('pk_test_valid123')).toBe(true);
      expect(isValidPublishableKey('pk_live_valid123')).toBe(true);
      expect(isValidPublishableKey('invalid_key')).toBe(false);
      expect(isValidPublishableKey('')).toBe(false);
      expect(isValidPublishableKey(undefined)).toBe(false);
    });
  });
});