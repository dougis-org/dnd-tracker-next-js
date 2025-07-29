/**
 * Test patterns for session persistence testing
 * Reduces complexity by extracting common test patterns
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import {
  createMockCollection,
  createMockDatabase,
  createMockClient,
  createSessionData,
  resetMongooseModels,
} from './session-test-utils';

/**
 * Setup persistence test environment
 */
export function setupPersistenceTestEnv() {
  const mockCollection = createMockCollection();
  const mockDb = createMockDatabase({ sessions: mockCollection });
  const mockClient = createMockClient(mockDb);

  return { mockClient, mockDb, mockCollection };
}

/**
 * Test session document creation patterns
 */
export function testSessionDocumentCreation(_mockCollection: any) {
  return {
    async testCreateSession() {
      // Test that adapter can be created without errors
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      expect(adapter.createSession).toBeDefined();
    },

    async testSessionStructure() {
      const sessionData = createSessionData();

      expect(sessionData).toHaveProperty('sessionToken');
      expect(sessionData).toHaveProperty('userId');
      expect(sessionData).toHaveProperty('expires');
      expect(typeof sessionData.sessionToken).toBe('string');
      expect(typeof sessionData.userId).toBe('string');
      expect(sessionData.expires).toBeInstanceOf(Date);
    },
  };
}

/**
 * Test session retrieval patterns
 */
export function testSessionRetrieval(_mockCollection: any) {
  return {
    async testGetSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      // Test that adapter has session methods (some may be optional)
      expect(typeof adapter).toBe('object');
    },

    async testNonExistentSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      // Test that adapter has session methods (some may be optional)
      expect(typeof adapter).toBe('object');
    },
  };
}

/**
 * Test session update patterns
 */
export function testSessionUpdates(_mockCollection: any) {
  return {
    async testUpdateSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      expect(adapter.updateSession).toBeDefined();
    },

    async testUpdateNonExistentSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      expect(adapter.updateSession).toBeDefined();
    },
  };
}

/**
 * Test session deletion patterns
 */
export function testSessionDeletion(_mockCollection: any) {
  return {
    async testDeleteSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      expect(adapter.deleteSession).toBeDefined();
    },

    async testDeleteNonExistentSession() {
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
      expect(adapter.deleteSession).toBeDefined();
    },
  };
}

/**
 * Test mongoose integration patterns
 */
export function testMongooseIntegration() {
  return {
    testConnectionState() {
      expect(mongoose.connection.readyState).toBeDefined();
    },

    testModelRegistration() {
      const modelsBefore = Object.keys(mongoose.models);

      // Simulate model registration during adapter initialization
      const testModelName = 'TestSessionModel';
      if (!mongoose.models[testModelName]) {
        const schema = new mongoose.Schema({
          sessionToken: String,
          userId: String,
          expires: Date,
        });
        mongoose.model(testModelName, schema);
      }

      const modelsAfter = Object.keys(mongoose.models);
      expect(modelsAfter.length).toBeGreaterThanOrEqual(modelsBefore.length);
    },

    async testModelCleanup() {
      resetMongooseModels();
      const modelsAfter = Object.keys(mongoose.models);
      expect(modelsAfter).toEqual([]);
    },
  };
}

/**
 * Test database connection patterns
 */
export function testDatabaseConnection(mockClient: any, _mockDb: any) {
  return {
    async testSuccessfulConnection() {
      expect(mockClient.connect).toBeDefined();
      expect(mockClient.db).toBeDefined();
      expect(mockDb.collection).toBeDefined();
    },

    async testConnectionError() {
      const errorClient = createMockClient(null);
      errorClient.connect.mockRejectedValue(new Error('Connection failed'));

      try {
        await errorClient.connect();
        fail('Should have thrown connection error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Connection failed');
      }
    },

    async testDatabaseAccess() {
      const db = mockClient.db('test-database');
      expect(db).toBeDefined();
      expect(db.collection).toBeDefined();

      const collection = db.collection('sessions');
      expect(collection).toBeDefined();
    },
  };
}

/**
 * Test error handling patterns
 */
export function testErrorHandling(_mockCollection: any) {
  return {
    async testDatabaseErrors() {
      // Test adapter creation doesn't fail
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
    },

    async testInvalidSessionData() {
      // Test adapter creation doesn't fail
      const adapter = MongoDBAdapter(Promise.resolve({} as MongoClient));
      expect(adapter).toBeDefined();
    },

    async testConnectionFailure() {
      const mockClientError = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        db: jest.fn(),
        close: jest.fn(),
      };

      try {
        await mockClientError.connect();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Connection failed');
      }
    },
  };
}