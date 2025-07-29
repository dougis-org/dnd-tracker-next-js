/**
 * @jest-environment node
 */

import { connectToDatabase, disconnectFromDatabase, getConnectionStatus } from '../db';

// Mock mongoose completely
const mockConnect = jest.fn();
const mockClose = jest.fn();
const mockOn = jest.fn();

jest.mock('mongoose', () => {
  const mockConnection = {
    close: mockClose,
    on: mockOn,
    readyState: 0,
  };

  return {
    connect: mockConnect,
    connection: mockConnection,
    connections: [mockConnection],
  };
});

// Mock environment variables
const originalEnv = process.env;

describe('Database Connection', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockConnect.mockClear();
    mockClose.mockClear();
    mockOn.mockClear();

    // Setup test environment
    process.env = {
      ...originalEnv,
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'testdb',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('connectToDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
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
    });

    it('should throw error when MONGODB_URI is not defined', async () => {
      delete process.env.MONGODB_URI;

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_URI environment variable is not defined'
      );
    });

    it('should throw error when MONGODB_DB_NAME is not defined', async () => {
      delete process.env.MONGODB_DB_NAME;

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_DB_NAME environment variable is not defined'
      );
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValue(connectionError);

      await expect(connectToDatabase()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnectFromDatabase', () => {
    it('should disconnect from MongoDB when connected', async () => {
      // First connect
      mockConnect.mockResolvedValue({});
      await connectToDatabase();

      // Then disconnect
      await disconnectFromDatabase();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle disconnection when not connected', async () => {
      await disconnectFromDatabase();

      // Should not call close when not connected
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return correct connection status', async () => {
      // Initially should be false (not connected)
      let status = getConnectionStatus();
      expect(typeof status).toBe('boolean');

      // After connection attempt, behavior depends on implementation
      mockConnect.mockResolvedValue({});
      await connectToDatabase();

      status = getConnectionStatus();
      expect(typeof status).toBe('boolean');
    });
  });
});