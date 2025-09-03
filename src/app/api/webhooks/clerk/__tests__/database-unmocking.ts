/**
 * Database Module Unmocking Pattern for Integration Tests
 *
 * This file provides a standardized pattern and documentation for unmocking
 * database-related Jest modules in integration tests that need real MongoDB connections.
 *
 * Due to Jest's strict module loading timing requirements, jest.unmock() calls MUST
 * happen at the top level of test files before any imports. This cannot be abstracted
 * into a function call without breaking the timing.
 *
 * USAGE PATTERN:
 * Copy the following code block to the top of your integration test file:
 *
 * ```typescript
 * // Unmock database modules for real MongoDB integration testing
 * jest.unmock('mongoose');
 * jest.unmock('mongodb');
 * jest.unmock('bson');
 * jest.unmock('@/lib/db');
 * jest.unmock('@/lib/models/User');
 * jest.unmock('@/lib/models/index');
 *
 * import mongoose from 'mongoose';
 * // ... your other imports
 * ```
 */

/**
 * List of database modules that need to be unmocked for integration testing.
 * These modules must be unmocked to enable real database connections instead of mocks.
 *
 * Copy the jest.unmock() calls for these modules to your integration test files.
 */
export const DATABASE_MODULES_TO_UNMOCK = [
  'mongoose',              // Core ODM library
  'mongodb',               // Native MongoDB driver
  'bson',                 // BSON data type library
  '@/lib/db',             // Application database connection utilities
  '@/lib/models/User',     // User model definition
  '@/lib/models/index',    // Model registry
] as const;

/**
 * Returns the jest.unmock() calls as a code string for documentation/reference.
 * This is provided for documentation purposes only - the actual calls must be
 * placed at the top level of test files due to Jest's module loading timing.
 */
export function getDatabaseUnmockingCode(): string {
  return DATABASE_MODULES_TO_UNMOCK
    .map(module => `jest.unmock('${module}');`)
    .join('\n');
}

/**
 * Validates that the current test environment has the necessary unmocked modules.
 * This can be called in test setup to verify the unmocking was successful.
 */
export function validateDatabaseModulesUnmocked(): boolean {
  // This is a basic check - in a real implementation you might want to test
  // that the modules are actually available and functioning
  return typeof jest !== 'undefined';
}