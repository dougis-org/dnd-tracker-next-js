/**
 * Tests for origin validation utilities
 * Addresses Issue #473: Login redirect and token persistence issues
 */

import { areOriginsEquivalent, isValidCallbackUrl, getTrustedDomains } from '../origin-validation';

describe('areOriginsEquivalent', () => {
  const testCases = {
    development: {
      equivalent: [
        ['http://localhost:3000', 'http://localhost:3000'],
        ['https://example.com', 'https://example.com'],
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
        ['http://localhost:3000', 'http://0.0.0.0:3000'],
        ['http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
      ],
      notEquivalent: [
        ['http://localhost:3000', 'http://127.0.0.1:3001'],
        ['http://localhost:3000', 'http://0.0.0.0:4000'],
        ['http://localhost:3000', 'https://127.0.0.1:3000'],
        ['https://localhost:3000', 'http://0.0.0.0:3000'],
        ['http://localhost:3000', 'https://evil.com:3000'],
        ['https://example.com', 'https://different.com'],
      ],
    },
    production: {
      equivalent: [
        ['https://dndtracker.com', 'https://dndtracker.com'],
      ],
      notEquivalent: [
        ['https://dndtracker.com', 'https://evil.com'],
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
        ['http://localhost:3000', 'http://0.0.0.0:3000'],
      ],
    },
  };

  describe('in development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it.each(testCases.development.equivalent)('should treat %s and %s as equivalent', (origin1, origin2) => {
      expect(areOriginsEquivalent(origin1, origin2)).toBe(true);
    });

    it.each(testCases.development.notEquivalent)('should treat %s and %s as not equivalent', (origin1, origin2) => {
      expect(areOriginsEquivalent(origin1, origin2)).toBe(false);
    });
  });

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it.each(testCases.production.equivalent)('should treat %s and %s as equivalent', (origin1, origin2) => {
      expect(areOriginsEquivalent(origin1, origin2)).toBe(true);
    });

    it.each(testCases.production.notEquivalent)('should treat %s and %s as not equivalent', (origin1, origin2) => {
      expect(areOriginsEquivalent(origin1, origin2)).toBe(false);
    });
  });
});

describe('isValidCallbackUrl', () => {
  const validCallbackTestCases = [
    // [description, callbackUrl, currentOrigin, options, expected]
    ['relative URLs by default', '/dashboard', 'http://localhost:3000', {}, true],
    ['relative URLs by default with different origin', '/settings', 'https://example.com', {}, true],
    ['relative URLs when disabled', '/dashboard', 'http://localhost:3000', { allowRelative: false }, false],
  ];

  const developmentTestCases = [
    ['same origin URLs', 'http://localhost:3000/dashboard', 'http://localhost:3000', {}, true],
    ['localhost to 127.0.0.1 variation', 'http://127.0.0.1:3000/dashboard', 'http://localhost:3000', {}, true],
    ['localhost to 0.0.0.0 variation', 'http://0.0.0.0:3000/dashboard', 'http://localhost:3000', {}, true],
    ['127.0.0.1 to localhost variation', 'http://localhost:3000/dashboard', 'http://127.0.0.1:3000', {}, true],
    ['external URLs', 'https://evil.com/dashboard', 'http://localhost:3000', {}, false],
    ['explicitly trusted domains', 'https://trusted.com/dashboard', 'http://localhost:3000', { allowedDomains: ['trusted.com'] }, true],
  ];

  const productionTestCases = [
    ['exact origin match', 'https://dndtracker.com/dashboard', 'https://dndtracker.com', {}, true],
    ['external URLs', 'https://evil.com/dashboard', 'https://dndtracker.com', {}, false],
    ['localhost variations', 'http://127.0.0.1:3000/dashboard', 'http://localhost:3000', {}, false],
    ['explicitly trusted domains', 'https://trusted.com/dashboard', 'https://dndtracker.com', { allowedDomains: ['trusted.com'] }, true],
  ];

  describe('relative URLs', () => {
    it.each(validCallbackTestCases)('should handle %s correctly', (_, callbackUrl, currentOrigin, options, expected) => {
      expect(isValidCallbackUrl(callbackUrl, currentOrigin, options)).toBe(expected);
    });
  });

  describe('absolute URLs in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it.each(developmentTestCases)('should handle %s correctly', (_, callbackUrl, currentOrigin, options, expected) => {
      expect(isValidCallbackUrl(callbackUrl, currentOrigin, options)).toBe(expected);
    });
  });

  describe('absolute URLs in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'development'; // Reset for other tests
    });

    it.each(productionTestCases)('should handle %s correctly', (_, callbackUrl, currentOrigin, options, expected) => {
      expect(isValidCallbackUrl(callbackUrl, currentOrigin, options)).toBe(expected);
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