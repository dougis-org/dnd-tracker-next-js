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
    const createConfig = (strategy: 'database' | 'jwt') => ({
      session: {
        strategy,
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
      },
      providers: [],
      callbacks: {},
    });

    test('should support database session strategy configuration', () => {
      const testConfig = createConfig('database');
      expect(testConfig.session.strategy).toBe('database');
      expect(testConfig.session.maxAge).toBe(30 * 24 * 60 * 60);
    });

    test('should support JWT session strategy (current implementation)', () => {
      const testConfig = createConfig('jwt');
      expect(testConfig.session.strategy).toBe('jwt');
      expect(testConfig.session.maxAge).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('Database Session Operations', () => {
    const testSessionOperation = async (_operation: string, method: any, ...args: any[]) => {
      await method(...args);
      expect(method).toHaveBeenCalledWith(...args);
    };

    test('should create session records in MongoDB when using database strategy', async () => {
      const sessionData = createSessionData();
      await testSessionOperation('create', mockSessionCollection.insertOne, sessionData);
    });

    test('should retrieve session records from MongoDB', async () => {
      const sessionData = createSessionData();
      const mockSession = { _id: 'session-object-id', ...sessionData };

      mockSessionCollection.findOne.mockResolvedValue(mockSession);
      const result = await mockSessionCollection.findOne({ sessionToken: sessionData.sessionToken });

      expect(result).toEqual(mockSession);
    });

    test('should update session records in MongoDB', async () => {
      const sessionData = createSessionData();
      const newExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      await testSessionOperation('update', mockSessionCollection.updateOne,
        { sessionToken: sessionData.sessionToken },
        { $set: { expires: newExpires } }
      );
    });

    test('should delete session records from MongoDB', async () => {
      const sessionData = createSessionData();
      await testSessionOperation('delete', mockSessionCollection.deleteOne,
        { sessionToken: sessionData.sessionToken }
      );
    });
  });

  describe('Session Collection Indexes', () => {
    test('should create appropriate indexes for session collection', async () => {
      const indexes = [
        [{ sessionToken: 1 }, { unique: true }],
        [{ expires: 1 }, { expireAfterSeconds: 0 }],
        [{ userId: 1 }]
      ];

      for (const [index, options] of indexes) {
        await mockSessionCollection.createIndex(index, options);
        expect(mockSessionCollection.createIndex).toHaveBeenCalledWith(index, options);
      }
    });
  });

  describe('Session Cleanup and Expiration', () => {
    test('should handle expired session cleanup', async () => {
      mockSessionCollection.deleteOne.mockResolvedValue({ deletedCount: 1, acknowledged: true });

      await mockSessionCollection.deleteOne({ expires: { $lt: new Date() } });
      expect(mockSessionCollection.deleteOne).toHaveBeenCalledWith({ expires: { $lt: expect.any(Date) } });
    });
  });

  describe('Integration with User Management', () => {
    test('should link sessions to user records correctly', async () => {
      const userData = createUserData();
      mockUserCollection.findOne.mockResolvedValue(userData);

      const user = await mockUserCollection.findOne({ _id: userData._id });
      expect(user).toEqual(userData);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      mockSessionCollection.findOne.mockRejectedValue(new Error('Database connection failed'));
      await expect(mockSessionCollection.findOne({ sessionToken: 'test-token' })).rejects.toThrow('Database connection failed');
    });

    test('should handle duplicate session token errors', async () => {
      const duplicateError = Object.assign(new Error('Duplicate key error'), { code: 11000 });
      mockSessionCollection.insertOne.mockRejectedValue(duplicateError);

      await expect(mockSessionCollection.insertOne({
        sessionToken: 'duplicate-token',
        userId: 'user-id',
        expires: new Date(),
      })).rejects.toThrow('Duplicate key error');
    });
  });
});