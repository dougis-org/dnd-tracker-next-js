/**
 * Test file for Session Manager Database Persistence (Issue #524)
 *
 * Tests to verify that NextAuth session persistence works correctly with MongoDB
 * and follows proper mongoose model registration patterns.
 */

import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import {
  setupPersistenceTestEnv,
  testSessionDocumentCreation,
  testSessionRetrieval,
  testSessionUpdates,
  testSessionDeletion,
  testMongooseIntegration,
  testDatabaseConnection,
  testErrorHandling,
} from './test-helpers/persistence-test-patterns';
import {
  setupStandardMocks,
  clearAllMocks,
} from './test-helpers/session-test-utils';

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
    const env = setupPersistenceTestEnv();
    mockClient = env.mockClient;
    mockDb = env.mockDb;
    mockCollection = env.mockCollection;

    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue(undefined);
    setupStandardMocks(mockCollection);
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('NextAuth MongoDB Adapter Session Persistence', () => {
    it('should create session documents in MongoDB with proper structure', async () => {
      const patterns = testSessionDocumentCreation(mockCollection);
      await patterns.testCreateSession();
    });

    it('should validate session document structure', async () => {
      const patterns = testSessionDocumentCreation(mockCollection);
      await patterns.testSessionStructure();
    });

    it('should retrieve session documents from MongoDB correctly', async () => {
      const patterns = testSessionRetrieval(mockCollection);
      await patterns.testGetSession();
    });

    it('should handle non-existent session retrieval', async () => {
      const patterns = testSessionRetrieval(mockCollection);
      await patterns.testNonExistentSession();
    });

    it('should update session documents in MongoDB correctly', async () => {
      const patterns = testSessionUpdates(mockCollection);
      await patterns.testUpdateSession();
    });

    it('should handle update of non-existent session', async () => {
      const patterns = testSessionUpdates(mockCollection);
      await patterns.testUpdateNonExistentSession();
    });

    it('should delete session documents from MongoDB correctly', async () => {
      const patterns = testSessionDeletion(mockCollection);
      await patterns.testDeleteSession();
    });

    it('should handle deletion of non-existent session', async () => {
      const patterns = testSessionDeletion(mockCollection);
      await patterns.testDeleteNonExistentSession();
    });
  });

  describe('Mongoose Model Registration Issues', () => {
    it('should verify mongoose connection state', () => {
      const patterns = testMongooseIntegration();
      patterns.testConnectionState();
    });

    it('should handle model registration properly', () => {
      const patterns = testMongooseIntegration();
      patterns.testModelRegistration();
    });

    it('should clean up models after tests', async () => {
      const patterns = testMongooseIntegration();
      await patterns.testModelCleanup();
    });

  });

  describe('Database Connection', () => {
    it('should handle successful database connection', async () => {
      const patterns = testDatabaseConnection(mockClient, mockDb);
      await patterns.testSuccessfulConnection();
    });

    it('should handle connection errors', async () => {
      const patterns = testDatabaseConnection(mockClient, mockDb);
      await patterns.testConnectionError();
    });

    it('should provide database access', async () => {
      const patterns = testDatabaseConnection(mockClient, mockDb);
      await patterns.testDatabaseAccess();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const patterns = testErrorHandling(mockCollection);
      await patterns.testDatabaseErrors();
    });

    it('should handle invalid session data', async () => {
      const patterns = testErrorHandling(mockCollection);
      await patterns.testInvalidSessionData();
    });

    it('should handle connection failures', async () => {
      const patterns = testErrorHandling(mockCollection);
      await patterns.testConnectionFailure();
    });
  });
});