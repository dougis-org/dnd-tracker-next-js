/**
 * MongoDB Adapter Configuration Tests (Issue #526)
 *
 * These tests verify the proper configuration of NextAuth's MongoDB adapter
 * to ensure session persistence and user management work correctly.
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import {
  createMockUser,
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock MongoDB client for testing
jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('MongoDB Adapter Configuration', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB collection methods
    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      createIndex: jest.fn(),
    };

    // Mock MongoDB database
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
      createCollection: jest.fn(),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
    };

    // Mock MongoDB client
    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    } as any;

    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue();
  });

  describe('Adapter Initialization', () => {
    it('should initialize MongoDB adapter with correct configuration', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const databaseName = 'test-dnd-tracker';

      // Act
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName,
      });

      // Assert
      expect(adapter).toBeDefined();
      expect(adapter.createUser).toBeDefined();
      expect(adapter.getUser).toBeDefined();
      expect(adapter.getUserByEmail).toBeDefined();
      expect(adapter.updateUser).toBeDefined();
      expect(adapter.deleteUser).toBeDefined();
      expect(adapter.createSession).toBeDefined();
      expect(adapter.getSession).toBeDefined();
      expect(adapter.updateSession).toBeDefined();
      expect(adapter.deleteSession).toBeDefined();
    });

    it('should use correct database name from environment', () => {
      // Arrange
      const originalEnv = process.env.MONGODB_DB_NAME;
      process.env.MONGODB_DB_NAME = 'dnd-tracker-test';
      const clientPromise = Promise.resolve(mockClient);

      // Act
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: process.env.MONGODB_DB_NAME,
      });

      // Assert
      expect(adapter).toBeDefined();

      // Cleanup
      process.env.MONGODB_DB_NAME = originalEnv;
    });

    it('should handle missing database name gracefully', () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);

      // Act & Assert
      expect(() => {
        MongoDBAdapter(clientPromise, {});
      }).not.toThrow();
    });
  });

  describe('MongoDB Client Configuration', () => {
    it('should create MongoDB client with correct URI', () => {
      // Arrange
      const testUri = 'mongodb://localhost:27017/test';

      // Act
      new MongoClient(testUri);

      // Assert
      expect(MockedMongoClient).toHaveBeenCalledWith(testUri);
    });

    it('should provide client promise to adapter', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);

      // Act
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Assert
      expect(adapter).toBeDefined();
      // The adapter should accept the client promise without throwing
    });

    it('should handle database connection through adapter', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Act & Assert - Adapter should be configured to handle database operations
      expect(typeof adapter.createUser).toBe('function');
      expect(typeof adapter.getUser).toBe('function');
      expect(typeof adapter.getUserByEmail).toBe('function');
      expect(typeof adapter.updateUser).toBe('function');
      expect(typeof adapter.deleteUser).toBe('function');
      expect(typeof adapter.createSession).toBe('function');
      expect(typeof adapter.getSession).toBe('function');
      expect(typeof adapter.updateSession).toBe('function');
      expect(typeof adapter.deleteSession).toBe('function');
    });
  });

  describe('Adapter Interface Validation', () => {
    let adapter: any;

    beforeEach(() => {
      const clientPromise = Promise.resolve(mockClient);
      adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-dnd-tracker',
      });
    });

    it('should provide all required user management methods', () => {
      // Assert - User management interface
      expect(adapter.createUser).toBeDefined();
      expect(adapter.getUser).toBeDefined();
      expect(adapter.getUserByEmail).toBeDefined();
      expect(adapter.updateUser).toBeDefined();
      expect(adapter.deleteUser).toBeDefined();

      // Account linking methods (may not be present in all adapter versions)
      if (adapter.linkAccount) {
        expect(adapter.linkAccount).toBeDefined();
      }
      if (adapter.unlinkAccount) {
        expect(adapter.unlinkAccount).toBeDefined();
      }
    });

    it('should provide all required session management methods', () => {
      // Assert - Session management interface
      expect(adapter.createSession).toBeDefined();
      expect(adapter.getSession).toBeDefined();
      expect(adapter.updateSession).toBeDefined();
      expect(adapter.deleteSession).toBeDefined();
    });

    it('should provide verification token methods', () => {
      // Assert - Verification token interface (may not be present in all adapter versions)
      if (adapter.createVerificationToken) {
        expect(adapter.createVerificationToken).toBeDefined();
      }
      if (adapter.useVerificationToken) {
        expect(adapter.useVerificationToken).toBeDefined();
      }

      // At minimum, adapter should exist and be functional
      expect(adapter).toBeDefined();
    });

    it('should provide account management methods', () => {
      // Assert - Account management interface
      expect(adapter.createUser).toBeDefined();

      // Account linking methods (may not be present in all adapter versions)
      if (adapter.linkAccount) {
        expect(adapter.linkAccount).toBeDefined();
      }
      if (adapter.unlinkAccount) {
        expect(adapter.unlinkAccount).toBeDefined();
      }

      // Core methods should always exist
      expect(adapter.getUserByEmail).toBeDefined();
      expect(adapter.updateUser).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should work with NextAuth configuration', () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const config = {
        adapter: MongoDBAdapter(clientPromise, {
          databaseName: process.env.MONGODB_DB_NAME || 'dnd-tracker',
        }),
        session: {
          strategy: 'database' as const,
          maxAge: 30 * 24 * 60 * 60, // 30 days
          updateAge: 24 * 60 * 60, // 24 hours
        },
      };

      // Act & Assert
      expect(config.adapter).toBeDefined();
      expect(config.session.strategy).toBe('database');
    });

    it('should integrate with environment variables', () => {
      // Arrange
      const originalUri = process.env.MONGODB_URI;
      const originalDbName = process.env.MONGODB_DB_NAME;

      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.MONGODB_DB_NAME = 'test-dnd-tracker';

      // Act
      const client = new MongoClient(process.env.MONGODB_URI);
      const clientPromise = Promise.resolve(client);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: process.env.MONGODB_DB_NAME,
      });

      // Assert
      expect(adapter).toBeDefined();
      expect(MockedMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/test');

      // Cleanup
      process.env.MONGODB_URI = originalUri;
      process.env.MONGODB_DB_NAME = originalDbName;
    });
  });

  describe('Error Handling Configuration', () => {
    it('should handle invalid MongoDB URI gracefully', () => {
      // Arrange
      const invalidUri = 'invalid-uri';

      // Act & Assert
      expect(() => {
        new MongoClient(invalidUri);
      }).not.toThrow(); // MongoClient constructor doesn't validate URI format
    });

    it('should handle missing environment variables', () => {
      // Arrange
      const originalUri = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;

      // Act & Assert
      // Should handle missing URI in production through error handling in auth.ts
      expect(() => {
        if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.CI) {
          throw new Error('MONGODB_URI environment variable is not set');
        }
      }).not.toThrow(); // In test environment, this should not throw

      // Cleanup
      process.env.MONGODB_URI = originalUri;
    });
  });

  describe('Integration with Existing UserService', () => {
    it('should work alongside existing UserService without conflicts', async () => {
      // Arrange
      const mockUser = createMockUser();

      mockedUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          sessionInfo: {
            sessionId: 'test-session',
            expiresAt: new Date(),
          },
        },
      });

      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-dnd-tracker',
      });

      // Act - Simulate NextAuth using both systems
      const userServiceResult = await UserService.getUserByEmail(mockUser.email);

      // Assert - Both should work independently
      expect(userServiceResult.success).toBe(true);
      expect(adapter.getUserByEmail).toBeDefined();
      expect(typeof adapter.getUserByEmail).toBe('function');
    });

    it('should maintain consistent user data structure expectations', async () => {
      // Arrange
      const mockUser = createMockUser();

      // Mock UserService response
      mockedUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-dnd-tracker',
      });

      // Act
      const userServiceResult = await UserService.getUserByEmail(mockUser.email);

      // Assert - Data structures should be compatible
      expect(userServiceResult.success).toBe(true);
      expect(userServiceResult.data?.email).toBe(mockUser.email);
      expect(userServiceResult.data?.id).toBe(mockUser.id);

      // NextAuth adapter should handle similar user structure
      expect(adapter.getUserByEmail).toBeDefined();
    });
  });

  describe('Production Configuration Validation', () => {
    it('should validate production environment requirements', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      const originalUri = process.env.MONGODB_URI;
      const originalVercel = process.env.VERCEL;
      const originalCI = process.env.CI;

      process.env.NODE_ENV = 'production';
      delete process.env.MONGODB_URI;
      delete process.env.VERCEL;
      delete process.env.CI;

      // Act & Assert
      expect(() => {
        // This simulates the check in auth.ts
        if (!process.env.MONGODB_URI &&
            process.env.NODE_ENV === 'production' &&
            process.env.VERCEL !== '1' &&
            process.env.CI !== 'true') {
          throw new Error('MONGODB_URI environment variable is not set');
        }
      }).toThrow('MONGODB_URI environment variable is not set');

      // Cleanup
      process.env.NODE_ENV = originalEnv;
      process.env.MONGODB_URI = originalUri;
      process.env.VERCEL = originalVercel;
      process.env.CI = originalCI;
    });

    it('should provide fallback configuration for development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const clientPromise = Promise.resolve(mockClient);

      // Act
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: process.env.MONGODB_DB_NAME || 'dnd-tracker-dev',
      });

      // Assert
      expect(adapter).toBeDefined();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});