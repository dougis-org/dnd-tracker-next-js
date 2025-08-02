/**
 * Session test helpers for Issue #527
 * Provides shared test utilities and setup for session tests
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock environment variables
export const mockEnv = {
  NEXTAUTH_SESSION_STRATEGY: undefined,
  USE_DATABASE_SESSIONS: 'false',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017/test',
};

let mongoServer: MongoMemoryServer;

/**
 * Setup test environment with MongoDB memory server
 */
export async function setupTestEnvironment() {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(mongoServer.getUri());
}

/**
 * Reset test environment and clear module state
 */
export function resetTestEnvironment() {
  resetModuleState();
  setupEnvVars(mockEnv);
  jest.clearAllMocks();
}

/**
 * Reset module state to avoid caching issues
 */
export function resetModuleState() {
  jest.resetModules();
  // Clear require cache for the modules we're testing
  const modulesToClear = [
    '../session-config',
    '../session/session-utilities',
    '../constants/session-constants',
    '../auth',
    '../auth-database-session'
  ];

  modulesToClear.forEach(modulePath => {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // Module might not be loaded yet, that's okay
    }
  });
}

/**
 * Setup environment variables for testing
 */
export function setupEnvVars(env: typeof mockEnv) {
  Object.keys(env).forEach(key => {
    if (env[key as keyof typeof mockEnv] !== undefined) {
      process.env[key] = env[key as keyof typeof mockEnv];
    } else {
      delete process.env[key];
    }
  });
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment() {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}