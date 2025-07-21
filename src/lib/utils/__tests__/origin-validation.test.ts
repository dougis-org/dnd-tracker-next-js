/**
 * Tests for origin validation utilities
 * Addresses Issue #473: Login redirect and token persistence issues
 */

import { areOriginsEquivalent, isValidCallbackUrl, getTrustedDomains } from '../origin-validation';

describe('areOriginsEquivalent', () => {
  const testCases = [
    // [environment, origin1, origin2, expected]
    ['development', 'http://localhost:3000', 'http://localhost:3000', true],
    ['development', 'https://example.com', 'https://example.com', true],
    ['development', 'http://localhost:3000', 'http://127.0.0.1:3000', true],
    ['development', 'http://localhost:3000', 'http://0.0.0.0:3000', true],
    ['development', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000', true],
    ['development', 'http://localhost:3000', 'http://127.0.0.1:3001', false],
    ['development', 'http://localhost:3000', 'http://0.0.0.0:4000', false],
    ['development', 'http://localhost:3000', 'https://127.0.0.1:3000', false],
    ['development', 'https://localhost:3000', 'http://0.0.0.0:3000', false],
    ['development', 'http://localhost:3000', 'https://evil.com:3000', false],
    ['development', 'https://example.com', 'https://different.com', false],
    ['production', 'https://dndtracker.com', 'https://dndtracker.com', true],
    ['production', 'https://dndtracker.com', 'https://evil.com', false],
    ['production', 'http://localhost:3000', 'http://127.0.0.1:3000', false],
    ['production', 'http://localhost:3000', 'http://0.0.0.0:3000', false],
  ];

  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it.each(testCases)('in %s environment should treat %s and %s as %s', (environment, origin1, origin2, expected) => {
    process.env.NODE_ENV = environment;
    expect(areOriginsEquivalent(origin1, origin2)).toBe(expected);
  });
});

describe('isValidCallbackUrl', () => {
  const testCases = [
    // [environment, description, callbackUrl, currentOrigin, options, expected]
    [null, 'relative URLs by default', '/dashboard', 'http://localhost:3000', {}, true],
    [null, 'relative URLs by default with different origin', '/settings', 'https://example.com', {}, true],
    [null, 'relative URLs when disabled', '/dashboard', 'http://localhost:3000', { allowRelative: false }, false],
    ['development', 'same origin URLs', 'http://localhost:3000/dashboard', 'http://localhost:3000', {}, true],
    ['development', 'localhost to 127.0.0.1 variation', 'http://127.0.0.1:3000/dashboard', 'http://localhost:3000', {}, true],
    ['development', 'localhost to 0.0.0.0 variation', 'http://0.0.0.0:3000/dashboard', 'http://localhost:3000', {}, true],
    ['development', '127.0.0.1 to localhost variation', 'http://localhost:3000/dashboard', 'http://127.0.0.1:3000', {}, true],
    ['development', 'external URLs', 'https://evil.com/dashboard', 'http://localhost:3000', {}, false],
    ['development', 'explicitly trusted domains', 'https://trusted.com/dashboard', 'http://localhost:3000', { allowedDomains: ['trusted.com'] }, true],
    ['production', 'exact origin match', 'https://dndtracker.com/dashboard', 'https://dndtracker.com', {}, true],
    ['production', 'external URLs', 'https://evil.com/dashboard', 'https://dndtracker.com', {}, false],
    ['production', 'localhost variations', 'http://127.0.0.1:3000/dashboard', 'http://localhost:3000', {}, false],
    ['production', 'explicitly trusted domains', 'https://trusted.com/dashboard', 'https://dndtracker.com', { allowedDomains: ['trusted.com'] }, true],
  ];

  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it.each(testCases)('should handle %s correctly in %s environment', (environment, description, callbackUrl, currentOrigin, options, expected) => {
    if (environment) {
      process.env.NODE_ENV = environment;
    }
    expect(isValidCallbackUrl(callbackUrl, currentOrigin, options)).toBe(expected);
  });

  it('should reject malformed URLs', () => {
    expect(isValidCallbackUrl('not-a-url', 'http://localhost:3000')).toBe(false);
    expect(isValidCallbackUrl('javascript:alert("xss")', 'http://localhost:3000')).toBe(false);
  });
});

describe('getTrustedDomains', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  const testCases = [
    ['production', (domains: string[]) => {
      expect(domains).toContain('dndtracker.com');
      expect(domains).toContain('dnd-tracker.fly.dev');
      expect(domains.length).toBeGreaterThan(0);
    }],
    ['development', (domains: string[]) => {
      expect(domains).toEqual([]);
    }],
  ];

  it.each(testCases)('should return correct domains in %s environment', (environment, assertion) => {
    process.env.NODE_ENV = environment;
    const domains = getTrustedDomains();
    assertion(domains);
  });
});