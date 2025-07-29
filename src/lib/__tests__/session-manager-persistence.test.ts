/**
 * Test file for Session Manager Database Persistence (Issue #524)
 *
 * Tests to verify that NextAuth session persistence works correctly with MongoDB
 * and follows proper mongoose model registration patterns.
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

// Mock the MongoDB client for testing
jest.mock('mongodb');
jest.mock('@/lib/db');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

describe('Session Manager Database Persistence (Issue #524)', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    // Create mock MongoDB client and database
    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createIndex: jest.fn().mockResolvedValue('index_created'),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NextAuth MongoDB Adapter Session Persistence', () => {
    it('should create session documents in MongoDB with proper structure', async () => {
      // Arrange: Create MongoDB adapter
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Mock session data
      const sessionData = {
        sessionToken: 'test-session-token',
        userId: new mongoose.Types.ObjectId().toString(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      // Mock successful insertion
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new mongoose.Types.ObjectId(),
        acknowledged: true,
      });

      // Act: Create session via adapter
      if (adapter.createSession) {
        const result = await adapter.createSession(sessionData);

        // Assert: Verify session was created with correct structure
        expect(mockDb.collection).toHaveBeenCalledWith('sessions');
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionToken: sessionData.sessionToken,
            userId: sessionData.userId,
            expires: sessionData.expires,
          })
        );
        expect(result).toBeDefined();
      }
    });

    it('should retrieve session documents from MongoDB correctly', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      const sessionToken = 'test-session-token';
      const mockSessionDoc = {
        _id: new mongoose.Types.ObjectId(),
        sessionToken,
        userId: new mongoose.Types.ObjectId().toString(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Mock successful retrieval
      mockCollection.findOne.mockResolvedValue(mockSessionDoc);

      // Act: Get session via adapter
      if (adapter.getSessionAndUser) {
        const result = await adapter.getSessionAndUser(sessionToken);

        // Assert: Verify session was retrieved correctly
        expect(mockDb.collection).toHaveBeenCalledWith('sessions');
        expect(mockCollection.findOne).toHaveBeenCalledWith({
          sessionToken,
        });
        expect(result).toBeDefined();
      }
    });

    it('should update session documents in MongoDB correctly', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      const sessionData = {
        sessionToken: 'test-session-token',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Mock successful update
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      });

      // Act: Update session via adapter
      if (adapter.updateSession) {
        const result = await adapter.updateSession(sessionData);

        // Assert: Verify session was updated correctly
        expect(mockDb.collection).toHaveBeenCalledWith('sessions');
        expect(mockCollection.updateOne).toHaveBeenCalledWith(
          { sessionToken: sessionData.sessionToken },
          { $set: expect.objectContaining({ expires: sessionData.expires }) }
        );
        expect(result).toBeDefined();
      }
    });

    it('should delete session documents from MongoDB correctly', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      const sessionToken = 'test-session-token';

      // Mock successful deletion
      mockCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
      });

      // Act: Delete session via adapter
      if (adapter.deleteSession) {
        await adapter.deleteSession(sessionToken);

        // Assert: Verify session was deleted correctly
        expect(mockDb.collection).toHaveBeenCalledWith('sessions');
        expect(mockCollection.deleteOne).toHaveBeenCalledWith({
          sessionToken,
        });
      }
    });
  });

  describe('Mongoose Model Registration Issues', () => {
    it('should not have "model already registered" errors when adapter initializes', async () => {
      // This test verifies that NextAuth MongoDB adapter doesn't conflict
      // with mongoose model registration patterns

      // Arrange: Clear mongoose models to simulate fresh start
      mongoose.models = {};

      // Act: Create adapter multiple times (simulating test environment)
      const clientPromise = Promise.resolve(mockClient);

      const adapter1 = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      const adapter2 = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Assert: No errors should be thrown during adapter creation
      expect(adapter1).toBeDefined();
      expect(adapter2).toBeDefined();
    });

    it('should handle mongoose connection state properly', async () => {
      // Arrange: Mock mongoose connection states
      const originalModels = mongoose.models;

      // Simulate models being registered
      mongoose.models = {
        User: {} as any,
        Character: {} as any,
        Party: {} as any,
      };

      // Act: Create adapter while mongoose models exist
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Assert: Adapter should work regardless of mongoose state
      expect(adapter).toBeDefined();

      // Cleanup
      mongoose.models = originalModels;
    });
  });

  describe('Session CRUD Operations', () => {
    it('should create, read, update, and delete sessions correctly', async () => {
      // Arrange
      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      const sessionData = {
        sessionToken: 'crud-test-token',
        userId: new mongoose.Types.ObjectId().toString(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // Mock all operations
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new mongoose.Types.ObjectId(),
        acknowledged: true,
      });

      mockCollection.findOne.mockResolvedValue({
        ...sessionData,
        _id: new mongoose.Types.ObjectId(),
      });

      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      });

      mockCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
      });

      // Act & Assert: Test full CRUD cycle
      if (adapter.createSession && adapter.getSessionAndUser &&
          adapter.updateSession && adapter.deleteSession) {

        // Create
        const created = await adapter.createSession(sessionData);
        expect(created).toBeDefined();
        expect(mockCollection.insertOne).toHaveBeenCalled();

        // Read
        const retrieved = await adapter.getSessionAndUser(sessionData.sessionToken);
        expect(retrieved).toBeDefined();
        expect(mockCollection.findOne).toHaveBeenCalled();

        // Update
        const newExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        const updated = await adapter.updateSession({
          sessionToken: sessionData.sessionToken,
          expires: newExpires,
        });
        expect(updated).toBeDefined();
        expect(mockCollection.updateOne).toHaveBeenCalled();

        // Delete
        await adapter.deleteSession(sessionData.sessionToken);
        expect(mockCollection.deleteOne).toHaveBeenCalled();
      }
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange: Mock connection failure
      const failingClient = {
        db: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        }),
      } as any;

      const clientPromise = Promise.resolve(failingClient);

      // Act & Assert: Should not throw during adapter creation
      expect(() => {
        MongoDBAdapter(clientPromise, {
          databaseName: 'test-db',
        });
      }).not.toThrow();
    });

    it('should handle collection operation failures gracefully', async () => {
      // Arrange: Mock collection operation failure
      mockCollection.findOne.mockRejectedValue(new Error('Collection operation failed'));

      const clientPromise = Promise.resolve(mockClient);
      const adapter = MongoDBAdapter(clientPromise, {
        databaseName: 'test-db',
      });

      // Act & Assert: Should handle operation failures
      if (adapter.getSessionAndUser) {
        await expect(
          adapter.getSessionAndUser('test-token')
        ).rejects.toThrow('Collection operation failed');
      }
    });
  });
});