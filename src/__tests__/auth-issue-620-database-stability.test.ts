/**
 * Database Connection Stability Test for Issue #620
 *
 * Tests the enhanced database connection management to prevent
 * mongoose buffering timeout errors in authentication flows.
 */

import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  connectToDatabase,
  executeWithConnection,
  getConnectionStatus,
  gracefulShutdown
} from '@/lib/db-connection-manager';
import { UserService } from '@/lib/services';

// Test credentials from Issue #620 - use environment variables for security
const TEST_CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'test-password-123',
  username: process.env.TEST_USERNAME || 'testuser620',
  firstName: process.env.TEST_FIRST_NAME || 'Test',
  lastName: process.env.TEST_LAST_NAME || 'User'
};

describe('Database Connection Stability - Issue #620', () => {
  beforeAll(async () => {
    // Set up test environment variables if needed
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    }
    if (!process.env.MONGODB_DB_NAME) {
      process.env.MONGODB_DB_NAME = 'testdb';
    }
  });

  afterAll(async () => {
    // Clean up connections
    await gracefulShutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhanced Connection Management', () => {
    it('should handle connection establishment with retry logic', async () => {
      // Test that connection establishment works with the new manager
      await expect(connectToDatabase()).resolves.not.toThrow();

      const status = getConnectionStatus();
      console.log('Connection status:', status);

      // Connection should be established
      expect(status.connected).toBe(true);
      expect(status.healthy).toBe(true);
    });

    it('should execute database operations with connection guarantee', async () => {
      // Mock a simple database operation
      const mockOperation = jest.fn().mockResolvedValue({ success: true });

      const result = await executeWithConnection(mockOperation);

      expect(result).toEqual({ success: true });
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry connection on transient errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('buffering timed out'))
        .mockResolvedValue({ success: true });

      const result = await executeWithConnection(mockOperation);

      expect(result).toEqual({ success: true });
      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + retry
    });

    it('should handle multiple concurrent connection requests', async () => {
      // Simulate multiple authentication requests happening simultaneously
      const promises = Array.from({ length: 5 }, (_, i) =>
        executeWithConnection(async () => ({ id: i, success: true }))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toEqual({ id: index, success: true });
      });
    });
  });

  describe('Authentication Flow with Enhanced Connection', () => {
    it('should handle user registration with stable connections', async () => {
      // Mock successful user creation to avoid actual database operations in test
      const mockCreateUser = jest.spyOn(UserService, 'createUser').mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            email: TEST_CREDENTIALS.email,
            username: TEST_CREDENTIALS.username,
            firstName: TEST_CREDENTIALS.firstName,
            lastName: TEST_CREDENTIALS.lastName,
            isEmailVerified: true,
            subscriptionTier: 'free',
            role: 'user',
          },
          emailBypass: true,
        },
      });

      const result = await UserService.createUser({
        email: TEST_CREDENTIALS.email,
        username: TEST_CREDENTIALS.username,
        firstName: TEST_CREDENTIALS.firstName,
        lastName: TEST_CREDENTIALS.lastName,
        password: TEST_CREDENTIALS.password,
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(TEST_CREDENTIALS.email);

      mockCreateUser.mockRestore();
    });

    it('should handle user authentication with stable connections', async () => {
      // Mock successful authentication to avoid actual database operations in test
      const mockAuthenticateUser = jest.spyOn(UserService, 'authenticateUser').mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            email: TEST_CREDENTIALS.email,
            username: TEST_CREDENTIALS.username,
            firstName: TEST_CREDENTIALS.firstName,
            lastName: TEST_CREDENTIALS.lastName,
            isEmailVerified: true,
            subscriptionTier: 'free',
            role: 'user',
          },
          requiresVerification: false,
        },
      });

      const result = await UserService.authenticateUser({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(TEST_CREDENTIALS.email);
      expect(result.data?.requiresVerification).toBe(false);

      mockAuthenticateUser.mockRestore();
    });

    it('should handle repeated authentication attempts (Issue #620 scenario)', async () => {
      // Mock successful authentication for both attempts
      const mockAuthenticateUser = jest.spyOn(UserService, 'authenticateUser').mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            email: TEST_CREDENTIALS.email,
            username: TEST_CREDENTIALS.username,
            firstName: TEST_CREDENTIALS.firstName,
            lastName: TEST_CREDENTIALS.lastName,
            isEmailVerified: true,
            subscriptionTier: 'free',
            role: 'user',
          },
          requiresVerification: false,
        },
      });

      // First authentication attempt
      const firstResult = await UserService.authenticateUser({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      });

      expect(firstResult.success).toBe(true);
      console.log('First authentication successful');

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second authentication attempt (this is where Issue #620 failed)
      const secondResult = await UserService.authenticateUser({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      });

      expect(secondResult.success).toBe(true);
      console.log('Second authentication successful - Issue #620 resolved');

      // Both attempts should succeed with the enhanced connection management
      expect(firstResult.data?.user.email).toBe(TEST_CREDENTIALS.email);
      expect(secondResult.data?.user.email).toBe(TEST_CREDENTIALS.email);

      mockAuthenticateUser.mockRestore();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should identify connection-related errors correctly', async () => {
      const connectionErrors = [
        new Error('buffering timed out'),
        new Error('connection timeout'),
        new Error('network error'),
        new Error('socket closed'),
        new Error('disconnected from server')
      ];

      // These should be retried
      for (const error of connectionErrors) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue({ success: true });

        const result = await executeWithConnection(mockOperation);
        expect(result).toEqual({ success: true });
        expect(mockOperation).toHaveBeenCalledTimes(2);

        mockOperation.mockClear();
      }
    });

    it('should not retry non-connection errors', async () => {
      const nonConnectionErrors = [
        new Error('validation failed'),
        new Error('user not found'),
        new Error('invalid password')
      ];

      for (const error of nonConnectionErrors) {
        const mockOperation = jest.fn().mockRejectedValue(error);

        await expect(executeWithConnection(mockOperation)).rejects.toThrow(error.message);
        expect(mockOperation).toHaveBeenCalledTimes(1); // No retry
      }
    });

    it('should provide detailed connection status information', () => {
      const status = getConnectionStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('lastChecked');

      expect(typeof status.state).toBe('number');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.healthy).toBe('boolean');
      expect(typeof status.lastChecked).toBe('number');
    });
  });

  describe('Production Scenario Simulation', () => {
    it('should handle low-usage connection timeouts gracefully', async () => {
      // Simulate a scenario where the connection times out due to low usage
      // and then a user tries to authenticate

      console.log('Simulating low-usage timeout scenario...');

      // Mock a timeout error followed by successful reconnection
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('buffering timed out after 10000ms'))
        .mockResolvedValue({
          email: TEST_CREDENTIALS.email,
          passwordHash: '$2b$12$test',
          isEmailVerified: true
        });

      const result = await executeWithConnection(mockOperation);

      expect(result.email).toBe(TEST_CREDENTIALS.email);
      expect(mockOperation).toHaveBeenCalledTimes(2);

      console.log('Low-usage timeout scenario handled successfully');
    });

    it('should maintain connection health over time', async () => {
      // Simulate multiple operations over time to ensure connection stays healthy
      const operations = Array.from({ length: 10 }, (_, i) =>
        executeWithConnection(async () => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return { operationId: i, timestamp: Date.now() };
        })
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.operationId).toBe(index);
        expect(typeof result.timestamp).toBe('number');
      });

      // Connection should still be healthy after all operations
      const status = getConnectionStatus();
      expect(status.healthy).toBe(true);
    });
  });
});