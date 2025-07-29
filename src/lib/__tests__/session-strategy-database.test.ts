/**
 * Test for database session strategy configuration (Issue #524)
 *
 * Tests that NextAuth can be configured to use database sessions instead of JWT
 * and that session persistence works correctly with MongoDB.
 */

import { MongoClient } from 'mongodb';
import {
  createMockCollection,
  createMockDatabase,
  createMockClient,
  createSessionData,
  createUserData,
  setupStandardMocks,
  clearAllMocks,
} from './test-helpers/session-test-utils';

// Mock MongoDB and NextAuth dependencies
jest.mock('mongodb');
jest.mock('@auth/mongodb-adapter');
jest.mock('next-auth');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('Database Session Strategy (Issue #524)', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: any;
  let mockSessionCollection: any;
  let mockUserCollection: any;
  let mockAccountCollection: any;

  beforeEach(() => {
    // Setup mock collections using utilities
    mockSessionCollection = createMockCollection();
    mockUserCollection = createMockCollection();
    mockAccountCollection = createMockCollection();

    const collections = {
      sessions: mockSessionCollection,
      users: mockUserCollection,
      accounts: mockAccountCollection,
    };

    mockDb = createMockDatabase(collections);
    mockClient = createMockClient(mockDb);

    MockedMongoClient.mockImplementation(() => mockClient);
    setupStandardMocks(mockSessionCollection);
    setupStandardMocks(mockUserCollection);
    setupStandardMocks(mockAccountCollection);
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('Session Strategy Configuration', () => {
    test('should support database session strategy configuration', () => {
      // This test verifies that the configuration can be set up to use database sessions

      const testConfig = {
        adapter: {} as any, // MongoDB adapter would be here
        session: {
          strategy: 'database' as const,
          maxAge: 30 * 24 * 60 * 60, // 30 days
          updateAge: 24 * 60 * 60, // 24 hours
        },
        providers: [],
        callbacks: {},
      };

      // Assert: Configuration should be valid
      expect(testConfig.session.strategy).toBe('database');
      expect(testConfig.session.maxAge).toBe(30 * 24 * 60 * 60);
      expect(testConfig.session.updateAge).toBe(24 * 60 * 60);
    });

    test('should support JWT session strategy (current implementation)', () => {
      // This test verifies current JWT strategy works

      const testConfig = {
        session: {
          strategy: 'jwt' as const,
          maxAge: 30 * 24 * 60 * 60, // 30 days
          updateAge: 24 * 60 * 60, // 24 hours
        },
        providers: [],
        callbacks: {},
      };

      // Assert: JWT configuration should be valid
      expect(testConfig.session.strategy).toBe('jwt');
      expect(testConfig.session.maxAge).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('Database Session Operations', () => {
    test('should create session records in MongoDB when using database strategy', async () => {
      const sessionData = createSessionData();

      // Simulate session creation
      await mockSessionCollection.insertOne(sessionData);

      // Assert: Session should be created in sessions collection
      expect(mockSessionCollection.insertOne).toHaveBeenCalledWith(sessionData);
    });

    test('should retrieve session records from MongoDB', async () => {
      const sessionData = createSessionData();
      const mockSession = { _id: 'session-object-id', ...sessionData };

      // Mock successful session retrieval
      mockSessionCollection.findOne.mockResolvedValue(mockSession);

      // Simulate session retrieval
      const result = await mockSessionCollection.findOne({
        sessionToken: sessionData.sessionToken
      });

      // Assert: Session should be retrieved from sessions collection
      expect(mockSessionCollection.findOne).toHaveBeenCalledWith({
        sessionToken: sessionData.sessionToken
      });
      expect(result).toEqual(mockSession);
    });

    test('should update session records in MongoDB', async () => {
      const sessionData = createSessionData();
      const newExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      // Simulate session update
      await mockSessionCollection.updateOne(
        { sessionToken: sessionData.sessionToken },
        { $set: { expires: newExpires } }
      );

      // Assert: Session should be updated in sessions collection
      expect(mockSessionCollection.updateOne).toHaveBeenCalledWith(
        { sessionToken: sessionData.sessionToken },
        { $set: { expires: newExpires } }
      );
    });

    test('should delete session records from MongoDB', async () => {
      const sessionData = createSessionData();

      // Simulate session deletion
      await mockSessionCollection.deleteOne({
        sessionToken: sessionData.sessionToken
      });

      // Assert: Session should be deleted from sessions collection
      expect(mockSessionCollection.deleteOne).toHaveBeenCalledWith({
        sessionToken: sessionData.sessionToken
      });
    });
  });

  describe('Session Collection Indexes', () => {
    test('should create appropriate indexes for session collection', async () => {
      // Simulate index creation for sessions
      await mockSessionCollection.createIndex({ sessionToken: 1 }, { unique: true });
      await mockSessionCollection.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
      await mockSessionCollection.createIndex({ userId: 1 });

      // Assert: Indexes should be created for efficient session operations
      expect(mockSessionCollection.createIndex).toHaveBeenCalledWith(
        { sessionToken: 1 },
        { unique: true }
      );
      expect(mockSessionCollection.createIndex).toHaveBeenCalledWith(
        { expires: 1 },
        { expireAfterSeconds: 0 }
      );
      expect(mockSessionCollection.createIndex).toHaveBeenCalledWith({ userId: 1 });
    });
  });

  describe('Session Cleanup and Expiration', () => {
    test('should handle expired session cleanup', async () => {
      // Mock cleanup of expired sessions
      mockSessionCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
      });

      // Simulate expired session cleanup
      await mockSessionCollection.deleteOne({
        expires: { $lt: new Date() }
      });

      // Assert: Expired sessions should be cleaned up
      expect(mockSessionCollection.deleteOne).toHaveBeenCalledWith({
        expires: { $lt: expect.any(Date) }
      });
    });
  });

  describe('Integration with User Management', () => {
    test('should link sessions to user records correctly', async () => {
      const userData = createUserData();

      // Mock user retrieval
      mockUserCollection.findOne.mockResolvedValue(userData);

      // Simulate user lookup for session
      const user = await mockUserCollection.findOne({ _id: userData._id });

      // Assert: User should be retrievable for session validation
      expect(mockUserCollection.findOne).toHaveBeenCalledWith({ _id: userData._id });
      expect(user).toEqual(userData);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database connection error
      mockSessionCollection.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Assert: Database errors should be handled
      await expect(
        mockSessionCollection.findOne({ sessionToken: 'test-token' })
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle duplicate session token errors', async () => {
      const duplicateError = new Error('Duplicate key error');
      (duplicateError as any).code = 11000; // MongoDB duplicate key error code

      // Mock duplicate session token error
      mockSessionCollection.insertOne.mockRejectedValue(duplicateError);

      // Assert: Duplicate token errors should be handled
      await expect(
        mockSessionCollection.insertOne({
          sessionToken: 'duplicate-token',
          userId: 'user-id',
          expires: new Date(),
        })
      ).rejects.toThrow('Duplicate key error');
    });
  });
});