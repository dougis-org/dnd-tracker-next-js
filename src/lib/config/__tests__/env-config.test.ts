/**
 * Tests for environment configuration utilities (Issue #482)
 */

import { 
  getNextAuthSecret, 
  getNextAuthUrl, 
  getSessionCookieName,
  validateEnvironmentConfig 
} from '../env-config';

describe('Environment Configuration Utilities', () => {
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

  describe('getNextAuthSecret', () => {
    it('should return AUTH_SECRET when available', () => {
      process.env.AUTH_SECRET = 'auth-secret-value';
      process.env.NEXTAUTH_SECRET = 'nextauth-secret-value';

      const result = getNextAuthSecret();

      expect(result).toBe('auth-secret-value');
    });

    it('should return NEXTAUTH_SECRET when AUTH_SECRET is not available', () => {
      delete process.env.AUTH_SECRET;
      process.env.NEXTAUTH_SECRET = 'nextauth-secret-value';

      const result = getNextAuthSecret();

      expect(result).toBe('nextauth-secret-value');
    });

    it('should return undefined when neither secret is available', () => {
      delete process.env.AUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      const result = getNextAuthSecret();

      expect(result).toBeUndefined();
    });
  });

  describe('getNextAuthUrl', () => {
    it('should return AUTH_URL when available', () => {
      process.env.AUTH_URL = 'https://auth.example.com';
      process.env.NEXTAUTH_URL = 'https://nextauth.example.com';

      const result = getNextAuthUrl();

      expect(result).toBe('https://auth.example.com');
    });

    it('should return NEXTAUTH_URL when AUTH_URL is not available', () => {
      delete process.env.AUTH_URL;
      process.env.NEXTAUTH_URL = 'https://nextauth.example.com';

      const result = getNextAuthUrl();

      expect(result).toBe('https://nextauth.example.com');
    });

    it('should return undefined when neither URL is available', () => {
      delete process.env.AUTH_URL;
      delete process.env.NEXTAUTH_URL;

      const result = getNextAuthUrl();

      expect(result).toBeUndefined();
    });
  });

  describe('getSessionCookieName', () => {
    it('should return secure cookie name in production', () => {
      process.env.NODE_ENV = 'production';

      const result = getSessionCookieName();

      expect(result).toBe('__Secure-next-auth.session-token');
    });

    it('should return regular cookie name in development', () => {
      process.env.NODE_ENV = 'development';

      const result = getSessionCookieName();

      expect(result).toBe('next-auth.session-token');
    });

    it('should return regular cookie name when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const result = getSessionCookieName();

      expect(result).toBe('next-auth.session-token');
    });
  });

  describe('validateEnvironmentConfig', () => {
    it('should return validation results with all environment variables present', () => {
      process.env.AUTH_SECRET = 'test-secret';
      process.env.AUTH_URL = 'https://test.example.com';
      process.env.NODE_ENV = 'production';

      const result = validateEnvironmentConfig();

      expect(result).toEqual({
        hasSecret: true,
        hasUrl: true,
        cookieName: '__Secure-next-auth.session-token',
        nodeEnv: 'production',
      });
    });

    it('should return validation results with missing environment variables', () => {
      delete process.env.AUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.AUTH_URL;
      delete process.env.NEXTAUTH_URL;
      process.env.NODE_ENV = 'development';

      const result = validateEnvironmentConfig();

      expect(result).toEqual({
        hasSecret: false,
        hasUrl: false,
        cookieName: 'next-auth.session-token',
        nodeEnv: 'development',
      });
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const result = validateEnvironmentConfig();

      expect(result.nodeEnv).toBe('development');
    });
  });
});