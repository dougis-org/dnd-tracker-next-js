/**
 * Tests for origin validation utilities
 * Addresses Issue #473: Login redirect and token persistence issues
 */

import { areOriginsEquivalent, isValidCallbackUrl, getTrustedDomains } from '../origin-validation';

describe('areOriginsEquivalent', () => {
  describe('in development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should treat exact origins as equivalent', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'http://localhost:3000')).toBe(true);
      expect(areOriginsEquivalent('https://example.com', 'https://example.com')).toBe(true);
    });

    it('should treat localhost variations as equivalent', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'http://127.0.0.1:3000')).toBe(true);
      expect(areOriginsEquivalent('http://localhost:3000', 'http://0.0.0.0:3000')).toBe(true);
      expect(areOriginsEquivalent('http://127.0.0.1:3000', 'http://0.0.0.0:3000')).toBe(true);
    });

    it('should require same port for localhost variations', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'http://127.0.0.1:3001')).toBe(false);
      expect(areOriginsEquivalent('http://localhost:3000', 'http://0.0.0.0:4000')).toBe(false);
    });

    it('should require same protocol for localhost variations', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'https://127.0.0.1:3000')).toBe(false);
      expect(areOriginsEquivalent('https://localhost:3000', 'http://0.0.0.0:3000')).toBe(false);
    });

    it('should not treat external domains as equivalent', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'https://evil.com:3000')).toBe(false);
      expect(areOriginsEquivalent('https://example.com', 'https://different.com')).toBe(false);
    });
  });

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it('should require exact origin match', () => {
      expect(areOriginsEquivalent('https://dndtracker.com', 'https://dndtracker.com')).toBe(true);
      expect(areOriginsEquivalent('https://dndtracker.com', 'https://evil.com')).toBe(false);
    });

    it('should not treat localhost variations as equivalent in production', () => {
      expect(areOriginsEquivalent('http://localhost:3000', 'http://127.0.0.1:3000')).toBe(false);
      expect(areOriginsEquivalent('http://localhost:3000', 'http://0.0.0.0:3000')).toBe(false);
    });
  });
});

describe('isValidCallbackUrl', () => {
  describe('relative URLs', () => {
    it('should allow relative URLs by default', () => {
      expect(isValidCallbackUrl('/dashboard', 'http://localhost:3000')).toBe(true);
      expect(isValidCallbackUrl('/settings', 'https://example.com')).toBe(true);
    });

    it('should reject relative URLs when disabled', () => {
      expect(isValidCallbackUrl('/dashboard', 'http://localhost:3000', { allowRelative: false })).toBe(false);
    });
  });

  describe('absolute URLs in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow same origin URLs', () => {
      expect(isValidCallbackUrl('http://localhost:3000/dashboard', 'http://localhost:3000')).toBe(true);
    });

    it('should allow localhost variation URLs', () => {
      expect(isValidCallbackUrl('http://127.0.0.1:3000/dashboard', 'http://localhost:3000')).toBe(true);
      expect(isValidCallbackUrl('http://0.0.0.0:3000/dashboard', 'http://localhost:3000')).toBe(true);
      expect(isValidCallbackUrl('http://localhost:3000/dashboard', 'http://127.0.0.1:3000')).toBe(true);
    });

    it('should reject external URLs', () => {
      expect(isValidCallbackUrl('https://evil.com/dashboard', 'http://localhost:3000')).toBe(false);
    });

    it('should allow explicitly trusted domains', () => {
      expect(isValidCallbackUrl(
        'https://trusted.com/dashboard',
        'http://localhost:3000',
        { allowedDomains: ['trusted.com'] }
      )).toBe(true);
    });
  });

  describe('absolute URLs in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it('should require exact origin match', () => {
      expect(isValidCallbackUrl('https://dndtracker.com/dashboard', 'https://dndtracker.com')).toBe(true);
      expect(isValidCallbackUrl('https://evil.com/dashboard', 'https://dndtracker.com')).toBe(false);
    });

    it('should not allow localhost variations', () => {
      expect(isValidCallbackUrl('http://127.0.0.1:3000/dashboard', 'http://localhost:3000')).toBe(false);
    });

    it('should allow explicitly trusted domains', () => {
      expect(isValidCallbackUrl(
        'https://trusted.com/dashboard',
        'https://dndtracker.com',
        { allowedDomains: ['trusted.com'] }
      )).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    it('should reject malformed URLs', () => {
      expect(isValidCallbackUrl('not-a-url', 'http://localhost:3000')).toBe(false);
      expect(isValidCallbackUrl('javascript:alert("xss")', 'http://localhost:3000')).toBe(false);
    });
  });
});

describe('getTrustedDomains', () => {
  it('should return production domains in production', () => {
    process.env.NODE_ENV = 'production';
    const domains = getTrustedDomains();
    expect(domains).toContain('dndtracker.com');
    expect(domains).toContain('dnd-tracker.fly.dev');
    expect(domains.length).toBeGreaterThan(0);
  });

  it('should return empty array in development', () => {
    process.env.NODE_ENV = 'development';
    const domains = getTrustedDomains();
    expect(domains).toEqual([]);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'development'; // Reset for other tests
  });
});