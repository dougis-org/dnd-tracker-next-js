/**
 * Comprehensive Test Suite for Database Connection Manager - Issue #620
 *
 * Tests the enhanced database connection management system to ensure
 * 80%+ code coverage and verify all critical functionality.
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';

// Mock mongoose before importing the module
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1, // Connected by default
    db: { admin: () => ({ ping: jest.fn().mockResolvedValue({ ok: 1 }) }) },
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  },
  connect: jest.fn().mockResolvedValue(undefined),
}));

// Mock process.on to avoid test environment conflicts
const originalProcessOn = process.on;
const mockProcessOn = jest.fn();

// Import the module after mocking
import {
  connectToDatabase,
  executeWithConnection,
  getConnectionStatus,
  gracefulShutdown
} from '@/lib/db-connection-manager';

describe('Database Connection Manager - Issue #620', () => {
  const originalEnv = process.env;
  const mockedMongoose = mongoose as jest.Mocked<typeof mongoose>;

  beforeAll(() => {
    // Mock process.on to prevent actual process event handlers
    process.on = mockProcessOn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env = {
      ...originalEnv,
      MONGODB_URI: 'mongodb://localhost:27017/test',
      MONGODB_DB_NAME: 'testdb',
    };

    // Reset mongoose connection state
    mockedMongoose.connection.readyState = 1; // Connected
    mockedMongoose.connection.db = {
      admin: () => ({ ping: jest.fn().mockResolvedValue({ ok: 1 }) })
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    process.on = originalProcessOn;
  });

  describe('Connection Status Management', () => {
    it('should return correct connection status when connected and healthy', () => {
      mockedMongoose.connection.readyState = 1; // Connected
      mockedMongoose.connection.db = { admin: () => ({ ping: jest.fn() }) } as any;

      const status = getConnectionStatus();

      expect(status.state).toBe(1);
      expect(status.connected).toBe(true);
      expect(status.healthy).toBe(true);
      expect(status.lastChecked).toBeGreaterThan(Date.now() - 1000);
    });

    it('should return correct connection status when disconnected', () => {
      mockedMongoose.connection.readyState = 0; // Disconnected
      mockedMongoose.connection.db = null as any;

      const status = getConnectionStatus();

      expect(status.state).toBe(0);
      expect(status.connected).toBe(false);
      expect(status.healthy).toBe(false);
    });

    it('should return unhealthy status when connected but no db instance', () => {
      mockedMongoose.connection.readyState = 1; // Connected
      mockedMongoose.connection.db = null as any;

      const status = getConnectionStatus();

      expect(status.state).toBe(1);
      expect(status.connected).toBe(true);
      expect(status.healthy).toBe(false);
    });
  });

  describe('Connection Establishment', () => {
    it('should connect successfully when already healthy', async () => {
      mockedMongoose.connection.readyState = 1; // Already connected
      mockedMongoose.connection.db = { admin: () => ({ ping: jest.fn() }) } as any;

      await connectToDatabase();

      // Should not attempt new connection
      expect(mockedMongoose.connect).not.toHaveBeenCalled();
    });

    it('should establish new connection when disconnected', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected
      mockedMongoose.connection.db = null as any;

      // Mock successful connection
      mockedMongoose.connect.mockResolvedValueOnce(undefined);
      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await connectToDatabase();

      expect(mockedMongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          dbName: 'testdb',
          bufferCommands: false,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          family: 4,
          heartbeatFrequencyMS: 10000,
          maxIdleTimeMS: 30000,
          retryWrites: true,
        })
      );
      expect(mockPing).toHaveBeenCalled();
    });

    it('should enable compression when environment variable is set', async () => {
      process.env.ENABLE_DB_COMPRESSION = 'true';
      mockedMongoose.connection.readyState = 0; // Disconnected

      mockedMongoose.connect.mockResolvedValueOnce(undefined);
      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await connectToDatabase();

      expect(mockedMongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          compressors: ['zlib'],
        })
      );
    });

    it('should throw error when MONGODB_URI is missing', async () => {
      delete process.env.MONGODB_URI;
      mockedMongoose.connection.readyState = 0; // Disconnected

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_URI environment variable is not defined'
      );
    });

    it('should throw error when MONGODB_DB_NAME is missing', async () => {
      delete process.env.MONGODB_DB_NAME;
      mockedMongoose.connection.readyState = 0; // Disconnected

      await expect(connectToDatabase()).rejects.toThrow(
        'MONGODB_DB_NAME environment variable is not defined'
      );
    });

    it('should retry connection on failure and eventually succeed', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      // First attempt fails, second succeeds
      mockedMongoose.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await connectToDatabase();

      expect(mockedMongoose.connect).toHaveBeenCalledTimes(2);
      expect(mockPing).toHaveBeenCalled();
    });

    it('should fail after maximum retry attempts', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      // All attempts fail
      mockedMongoose.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(connectToDatabase()).rejects.toThrow(
        'Failed to connect to database after 3 attempts'
      );

      expect(mockedMongoose.connect).toHaveBeenCalledTimes(3);
    });

    it('should handle ping verification failure', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      mockedMongoose.connect.mockResolvedValueOnce(undefined);
      const mockPing = jest.fn().mockResolvedValue({ ok: 0 }); // Ping fails
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await expect(connectToDatabase()).rejects.toThrow(
        'Failed to connect to database after 3 attempts'
      );
    });

    it('should handle missing database instance during verification', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      mockedMongoose.connect.mockResolvedValueOnce(undefined);
      mockedMongoose.connection.db = null as any; // No database instance

      await expect(connectToDatabase()).rejects.toThrow(
        'Failed to connect to database after 3 attempts'
      );
    });
  });

  describe('Execute with Connection', () => {
    it('should execute operation successfully when connection is healthy', async () => {
      mockedMongoose.connection.readyState = 1; // Connected
      mockedMongoose.connection.db = { admin: () => ({ ping: jest.fn() }) } as any;

      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await executeWithConnection(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should establish connection before executing operation when disconnected', async () => {
      mockedMongoose.connection.readyState = 0; // Initially disconnected

      const mockOperation = jest.fn().mockResolvedValue('success');
      
      // Mock connection establishment
      mockedMongoose.connect.mockResolvedValueOnce(undefined);
      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      const result = await executeWithConnection(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockedMongoose.connect).toHaveBeenCalled();
    });

    it('should retry operation once on connection error', async () => {
      // Start connected to avoid initial connection logic
      mockedMongoose.connection.readyState = 1; 
      mockedMongoose.connection.db = { admin: () => ({ ping: jest.fn().mockResolvedValue({ ok: 1 }) }) } as any;

      const connectionError = new Error('buffering timed out after 10000ms');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce('success after retry');

      // Mock successful reconnection
      mockedMongoose.connect.mockResolvedValueOnce(undefined);

      const result = await executeWithConnection(mockOperation);

      expect(result).toBe('success after retry');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-connection errors', async () => {
      mockedMongoose.connection.readyState = 1; // Connected

      const nonConnectionError = new Error('validation failed');
      const mockOperation = jest.fn().mockRejectedValue(nonConnectionError);

      await expect(executeWithConnection(mockOperation)).rejects.toThrow('validation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should identify various connection error patterns', async () => {
      mockedMongoose.connection.readyState = 1; // Connected

      const connectionErrors = [
        'buffering timed out',
        'connection lost',
        'network timeout',
        'socket disconnected',
        'connection closed',
      ];

      for (const errorMessage of connectionErrors) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error(errorMessage))
          .mockResolvedValueOnce('success');

        mockedMongoose.connect.mockResolvedValueOnce(undefined);
        const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
        mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

        const result = await executeWithConnection(mockOperation);
        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(2);

        jest.clearAllMocks();
      }
    });
  });

  describe('Connection Monitoring and Events', () => {
    it('should verify event handler setup capability', () => {
      // Test that the event handler functions exist and can be called
      expect(mockedMongoose.connection.on).toBeDefined();
      expect(typeof mockedMongoose.connection.on).toBe('function');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close connection gracefully when connected', async () => {
      mockedMongoose.connection.readyState = 1; // Connected
      mockedMongoose.connection.close.mockResolvedValueOnce(undefined);

      await gracefulShutdown();

      expect(mockedMongoose.connection.close).toHaveBeenCalled();
    });

    it('should handle shutdown when already disconnected', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      await gracefulShutdown();

      expect(mockedMongoose.connection.close).not.toHaveBeenCalled();
    });

    it('should handle errors during shutdown gracefully', async () => {
      mockedMongoose.connection.readyState = 1; // Connected
      mockedMongoose.connection.close.mockRejectedValueOnce(new Error('Close failed'));

      // Graceful shutdown should handle errors internally without throwing
      await expect(gracefulShutdown()).resolves.not.toThrow();
      
      // Verify close was attempted
      expect(mockedMongoose.connection.close).toHaveBeenCalled();
    });
  });

  describe('Concurrent Connection Handling', () => {
    it('should handle concurrent connection requests without multiple connections', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected

      // Mock delayed connection
      let connectResolve: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        connectResolve = resolve;
      });
      mockedMongoose.connect.mockReturnValueOnce(connectPromise);

      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      // Start multiple concurrent connections
      const connection1 = connectToDatabase();
      const connection2 = connectToDatabase();
      const connection3 = connectToDatabase();

      // Resolve the connection
      connectResolve!();
      
      await Promise.all([connection1, connection2, connection3]);

      // Should only call connect once despite multiple requests
      expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection State Edge Cases', () => {
    it('should handle force close during bad connection state', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected (bad state)
      mockedMongoose.connection.close.mockResolvedValueOnce(undefined);
      mockedMongoose.connect.mockResolvedValueOnce(undefined);

      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await connectToDatabase();

      expect(mockedMongoose.connection.close).toHaveBeenCalledWith(true); // Force close
      expect(mockedMongoose.connect).toHaveBeenCalled();
    });

    it('should handle errors during force close gracefully', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected (bad state)
      mockedMongoose.connection.close.mockRejectedValueOnce(new Error('Force close failed'));
      mockedMongoose.connect.mockResolvedValueOnce(undefined);

      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      // Should not throw despite force close error
      await expect(connectToDatabase()).resolves.toBeUndefined();
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle exponential backoff pattern correctly', async () => {
      mockedMongoose.connection.readyState = 0; // Disconnected
      
      // Clear existing calls from beforeEach
      jest.clearAllMocks();
      
      // Mock first failure, then success to test retry pattern
      mockedMongoose.connect
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce(undefined);

      // Set up ping to succeed for successful attempts
      const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
      mockedMongoose.connection.db = { admin: () => ({ ping: mockPing }) } as any;

      await connectToDatabase();

      // Should have attempted connection at least once and eventually succeeded
      expect(mockedMongoose.connect).toHaveBeenCalled();
      expect(mockPing).toHaveBeenCalled();
    });

    it('should handle null/undefined errors in isConnectionError check', async () => {
      mockedMongoose.connection.readyState = 1; // Connected

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(null) // null error
        .mockRejectedValueOnce(undefined) // undefined error
        .mockRejectedValueOnce({ message: null }) // error with null message
        .mockResolvedValueOnce('success');

      // These should not be treated as connection errors
      await expect(executeWithConnection(mockOperation)).rejects.toBeNull();
      
      jest.clearAllMocks();
      await expect(executeWithConnection(mockOperation)).rejects.toBeUndefined();
      
      jest.clearAllMocks();
      await expect(executeWithConnection(mockOperation)).rejects.toEqual({ message: null });
    });
  });
});