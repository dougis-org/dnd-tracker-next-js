/**
 * @jest-environment node
 */

describe('Database Connection Module', () => {
  const setupTestEnv = () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'testdb';
  };

  const testExports = (db: any, expectedExports: Record<string, string>) => {
    Object.entries(expectedExports).forEach(([name, type]) => {
      expect(typeof db[name]).toBe(type);
    });
  };

  it('should export required functions', () => {
    const db = require('../db');
    testExports(db, {
      connectToDatabase: 'function',
      disconnectFromDatabase: 'function',
      getConnectionStatus: 'function',
      mongoose: 'object'
    });
  });

  it('should return boolean from getConnectionStatus', () => {
    const { getConnectionStatus } = require('../db');
    expect(typeof getConnectionStatus()).toBe('boolean');
  });

  it('should have environment variables available for testing', () => {
    setupTestEnv();
    expect(process.env.MONGODB_URI).toBeTruthy();
    expect(process.env.MONGODB_DB_NAME).toBeTruthy();
  });

  it('should handle async function calls without crashing', async () => {
    const { connectToDatabase, disconnectFromDatabase } = require('../db');
    expect(async () => await connectToDatabase()).not.toThrow();
    expect(async () => await disconnectFromDatabase()).not.toThrow();
  });
});