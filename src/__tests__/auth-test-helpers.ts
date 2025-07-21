/**
 * Shared test helpers for authentication tests
 * Reduces code duplication across auth test files
 */

import { NextRequest } from 'next/server';

// Mock NextResponse to match existing test pattern
export const mockRedirect = jest.fn();
export const mockNext = jest.fn();
export const mockJson = jest.fn();

// Common mock setup
export const setupAuthMocks = () => {
  jest.mock('next/server', () => ({
    NextRequest: jest.fn(),
    NextResponse: {
      redirect: mockRedirect,
      next: mockNext,
      json: mockJson,
    },
  }));
};

// Helper function to create test requests
export const createTestRequest = (pathname: string): NextRequest => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
} as NextRequest);

// Common environment setup
export const setupTestEnvironment = (envOverrides: Record<string, string> = {}) => {
  const originalEnv = process.env;
  
  const defaultEnv = {
    NEXTAUTH_SECRET: 'test-secret-for-jwt-signing',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://test-uri',
    MONGODB_DB_NAME: 'test-db',
  };

  process.env = {
    ...originalEnv,
    ...defaultEnv,
    ...envOverrides,
  };

  return originalEnv;
};

// Reset mocks helper
export const resetAuthMocks = () => {
  jest.clearAllMocks();
  mockRedirect.mockReset();
  mockNext.mockReset();
  mockJson.mockReset();
};

// Common token factories
export const createValidToken = (overrides: Record<string, any> = {}) => ({
  sub: 'user-123',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
  iat: Math.floor(Date.now() / 1000),
  subscriptionTier: 'free',
  ...overrides,
});

export const createExpiredToken = (overrides: Record<string, any> = {}) => ({
  sub: 'user-123',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  iat: Math.floor(Date.now() / 1000) - 7200,
  ...overrides,
});

export const createInvalidToken = (overrides: Record<string, any> = {}) => ({
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  // Missing 'sub' field
  ...overrides,
});