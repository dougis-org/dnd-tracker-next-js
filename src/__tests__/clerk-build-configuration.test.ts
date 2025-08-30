/**
 * Tests for Issue #675 - Clerk Public Key Configuration for Build Process
 *
 * These tests verify that Clerk public key configuration is properly
 * accessible during build time and centrally managed.
 * SECURITY: Only the public key should be exposed - secret key must remain in env vars only.
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
      expect(content).toMatch(/export.*function.*getClerkPublishableKey/);
      expect(content).toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
    });

    it('should NEVER expose secret key values in the module', () => {
      const configPath = join(projectRoot, 'src', 'lib', 'config', 'clerk.ts');
      const content = readFileSync(configPath, 'utf-8');

      // Should NOT export or expose the secret key value
      expect(content).not.toMatch(/export.*CLERK_SECRET_KEY/);
      expect(content).not.toMatch(/const.*CLERK_SECRET_KEY.*=.*sk_/);
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

      const { getClerkPublishableKey } = require('../lib/config/clerk');

      // Should either return a fallback or handle gracefully
      expect(() => {
        const key = getClerkPublishableKey();
        expect(typeof key === 'string').toBe(true);
      }).not.toThrow();
    });

    it('should work with valid publishable key from environment', () => {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_valid_key_123';

      // Re-require to pick up new env var
      delete require.cache[require.resolve('../lib/config/clerk')];
      const { getClerkPublishableKey } = require('../lib/config/clerk');
      const key = getClerkPublishableKey();

      expect(key).toBe('pk_test_valid_key_123');
    });
  });

  describe('Build-time Safety', () => {
    it('should provide fallback configuration for development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      delete require.cache[require.resolve('../lib/config/clerk')];
      const { getClerkPublishableKey, isDevelopmentMode } = require('../lib/config/clerk');

      expect(isDevelopmentMode()).toBe(true);

      // Should provide a fallback key for development
      const key = getClerkPublishableKey();
      expect(typeof key === 'string').toBe(true);
      expect(key.startsWith('pk_test_')).toBe(true);

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

  describe('Security Requirements', () => {
    it('should never expose secret key in client-accessible code', () => {
      const configPath = join(projectRoot, 'src', 'lib', 'config', 'clerk.ts');
      const content = readFileSync(configPath, 'utf-8');

      // Secret keys should never be hardcoded or exposed
      expect(content).not.toMatch(/sk_test_[a-zA-Z0-9]/);
      expect(content).not.toMatch(/sk_live_[a-zA-Z0-9]/);
    });

    it('should only access secret key from process.env in server functions', () => {
      const { validateClerkServerConfig } = require('../lib/config/clerk');

      // This function should exist and only validate env vars, not expose them
      expect(typeof validateClerkServerConfig).toBe('function');
    });
  });
});