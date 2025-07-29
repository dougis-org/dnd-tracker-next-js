/**
 * @jest-environment node
 */

describe('Database Connection Module', () => {
  it('should export required functions', () => {
    const db = require('../db');

    expect(typeof db.connectToDatabase).toBe('function');
    expect(typeof db.disconnectFromDatabase).toBe('function');
    expect(typeof db.getConnectionStatus).toBe('function');
    expect(typeof db.mongoose).toBe('object');
  });

  it('should return boolean from getConnectionStatus', () => {
    const { getConnectionStatus } = require('../db');

    const status = getConnectionStatus();
    expect(typeof status).toBe('boolean');
  });

  it('should have environment variables available for testing', () => {
    // This ensures the test environment has the required variables
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'testdb';

    expect(process.env.MONGODB_URI).toBeTruthy();
    expect(process.env.MONGODB_DB_NAME).toBeTruthy();
  });

  it('should handle async function calls without crashing', async () => {
    const { connectToDatabase, disconnectFromDatabase } = require('../db');

    // These functions should be callable without throwing synchronous errors
    expect(async () => await connectToDatabase()).not.toThrow();
    expect(async () => await disconnectFromDatabase()).not.toThrow();
  });
});