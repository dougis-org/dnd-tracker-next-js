/**
 * @jest-environment node
 */

// Mock environment variables
const originalEnv = process.env;

// Create mock functions
const mockConnect = jest.fn();
const mockClose = jest.fn();
const mockOn = jest.fn();

// Create a mock connection object with mutable readyState
const mockConnection = {
  close: mockClose,
  on: mockOn,
  readyState: 0,
};

let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

// Mock mongoose module
jest.mock('mongoose', () => ({
  connect: mockConnect,
  connection: mockConnection,
}));

describe('Database Connection', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockConnect.mockClear();
    mockClose.mockClear();
    mockOn.mockClear();

    // Reset connection state
    mockConnection.readyState = 0;

    // Setup test environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'testdb',
    };

    // Mock console functions to avoid noise in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear the module cache to get fresh instance
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('connectToDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
      // Import here to get fresh instance after mocking
      const { connectToDatabase } = require('../db');

      // Mock successful connection
      mockConnect.mockResolvedValue({});

      await connectToDatabase();

      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017',
        expect.objectContaining({
          dbName: 'testdb',
          bufferCommands: false,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4,
        })
      );
      expect(mockOn).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    it('should throw error when MONGODB_URI is not defined', async () => {
      const { connectToDatabase } = require('../db');

      delete process.env.MONGODB_URI;

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_URI environment variable is not defined'
      );
    });

    it('should throw error when MONGODB_DB_NAME is not defined', async () => {
      const { connectToDatabase } = require('../db');

      delete process.env.MONGODB_DB_NAME;

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_DB_NAME environment variable is not defined'
      );
    });

    it('should handle connection errors', async () => {
      const { connectToDatabase } = require('../db');

      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValue(connectionError);

      await expect(connectToDatabase()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnectFromDatabase', () => {
    it('should disconnect from MongoDB when connected', async () => {
      const { disconnectFromDatabase } = require('../db');

      // Simulate connected state by calling the function and then setting the internal state
      // We need to manually set the internal connection state to connected
      const dbModule = require('../db');

      // Since we can't easily mock the internal state, let's test the actual behavior
      // Reset mocks first
      mockConnect.mockClear();
      mockClose.mockClear();

      // For this test, we need to verify that when disconnectFromDatabase is called
      // and there's a connection, it calls close
      mockConnect.mockResolvedValue({});

      // First connect to establish connection
      await dbModule.connectToDatabase();

      // Now test disconnect
      await disconnectFromDatabase();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle disconnection when not connected', async () => {
      const { disconnectFromDatabase } = require('../db');

      // Clear mocks
      mockClose.mockClear();

      await disconnectFromDatabase();

      // Should not call close when not connected
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return correct connection status', async () => {
      const { getConnectionStatus, connectToDatabase } = require('../db');

      // Initially should be false (not connected)
      let status = getConnectionStatus();
      expect(status).toBe(false);

      // After connection attempt
      mockConnect.mockResolvedValue({});
      mockConnection.readyState = 1; // Set to connected
      await connectToDatabase();

      status = getConnectionStatus();
      expect(status).toBe(true);
    });
  });
});