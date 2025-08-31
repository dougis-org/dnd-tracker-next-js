/**
 * Test for Issue #473 Fix: Authentication Trust Host Configuration
 * Validates trustHost configuration for production environments
 */

import { setupTestEnvironment } from './auth-test-helpers';

describe('Auth Trust Host Configuration Fix for Issue #473', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => { process.env = originalEnv; });

  const setupMockNextAuth = () => {
    let capturedConfig: any = null;
    jest.doMock('next-auth', () => jest.fn((config: any) => {
      capturedConfig = config;
      return { handlers: {}, auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() };
    }));
    return () => capturedConfig;
  };

  test('should set trustHost to true in production environment', async () => {
    originalEnv = setupTestEnvironment({
      NODE_ENV: 'production',
      NEXTAUTH_SECRET: 'production-secret',
      NEXTAUTH_URL: 'https://dndtracker.com',
    });

    const getConfig = setupMockNextAuth();
    await import('@/lib/auth');
    expect(getConfig().trustHost).toBe(true);
  });

  test('should set trustHost to true when AUTH_TRUST_HOST is true', async () => {
    originalEnv = setupTestEnvironment({
      NODE_ENV: 'development',
      AUTH_TRUST_HOST: 'true',
      NEXTAUTH_SECRET: 'dev-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
    });

    const getConfig = setupMockNextAuth();
    await import('@/lib/auth');
    expect(getConfig().trustHost).toBe(true);
  });

  test('should set trustHost to false in development without AUTH_TRUST_HOST', async () => {
    originalEnv = setupTestEnvironment({
      NODE_ENV: 'development',
      NEXTAUTH_SECRET: 'dev-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
    });

    const getConfig = setupMockNextAuth();
    await import('@/lib/auth');
    expect(getConfig().trustHost).toBe(false);
  });
});