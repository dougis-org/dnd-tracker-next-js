/**
 * Simplified test patterns for session testing
 */

import { getSessionConfig } from '@/lib/session-config';

/**
 * Basic strategy detection tests
 */
export function testJWTDefault() {
  delete process.env.NEXTAUTH_SESSION_STRATEGY;
  const config = getSessionConfig();
  expect(config.strategy).toBe('jwt');
}

export function testDatabaseStrategy() {
  const config = getSessionConfig('database');
  expect(config.strategy).toBe('database');
  expect(config.generateSessionToken).toBeDefined();
}

export function testInvalidFallback() {
  const config = getSessionConfig('invalid' as any);
  expect(config.strategy).toBe('jwt');
  expect(config.generateSessionToken).toBeUndefined();
}