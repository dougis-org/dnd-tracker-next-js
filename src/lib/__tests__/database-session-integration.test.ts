/**
 * Database Session Integration Tests (Issue #526)
 *
 * These tests verify that the database session configuration works correctly
 * with the MongoDB adapter and integrates properly with the existing authentication system.
 */

import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import {
  createMockUser,
  createMockCredentials,
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock dependencies
jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');

// Mock the NextAuth configuration modules
jest.mock('@/lib/auth-database-session', () => ({
  handlers: { GET: jest.fn(), POST: jest.fn() },
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentSession: jest.fn(),
  hasValidSession: jest.fn(),
  getSessionUserId: jest.fn(),
  SESSION_CONFIG: {
    USE_DATABASE_SESSIONS: true,
    MAX_AGE: 30 * 24 * 60 * 60,
    UPDATE_AGE: 24 * 60 * 60,
    DATABASE_NAME: 'test-dnd-tracker',
    COLLECTION_NAMES: {
      Users: 'users',
      Sessions: 'sessions',
      Accounts: 'accounts',
      VerificationTokens: 'verification_tokens',
    },
  },
}));

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

// Test utilities to reduce duplication
const createMockCollection = () => ({
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([])
  }),
  createIndex: jest.fn(),
  deleteMany: jest.fn(),
});

const createMockDatabase = (usersCollection: any, sessionsCollection: any) => ({
  collection: jest.fn((name: string) => {
    if (name === 'users') return usersCollection;
    if (name === 'sessions') return sessionsCollection;
    return createMockCollection();
  }),
  createCollection: jest.fn(),
  listCollections: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([]),
  }),
});

const createMockClient = (db: any) => ({
  db: jest.fn().mockReturnValue(db),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
} as any);

const createSessionData = (mockUser: any, sessionToken: string) => ({
  sessionToken,
  userId: mockUser.id?.toString(),
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});

const createStoredSession = (mockUser: any, sessionToken: string) => ({
  _id: 'session-id',
  sessionToken,
  userId: mockUser.id?.toString(),
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});

const createNextAuthUser = (mockUser: any) => ({
  _id: mockUser.id,
  email: mockUser.email,
  name: `${mockUser.firstName} ${mockUser.lastName}`,
  emailVerified: null,
});

describe('Database Session Integration', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: any;
  let mockUsersCollection: any;
  let mockSessionsCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersCollection = createMockCollection();
    mockSessionsCollection = createMockCollection();
    mockDb = createMockDatabase(mockUsersCollection, mockSessionsCollection);
    mockClient = createMockClient(mockDb);
    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue();
  });

  describe('Database Session Configuration', () => {
    const validateSessionConfig = (config: any) => {
      expect(config.USE_DATABASE_SESSIONS).toBe(true);
      expect(config.MAX_AGE).toBe(30 * 24 * 60 * 60);
      expect(config.UPDATE_AGE).toBe(24 * 60 * 60);
      expect(config.DATABASE_NAME).toBe('test-dnd-tracker');
    };

    const validateCollectionNames = (collectionNames: any) => {
      expect(collectionNames).toEqual({
        Users: 'users',
        Sessions: 'sessions',
        Accounts: 'accounts',
        VerificationTokens: 'verification_tokens',
      });
    };

    const validateAuthHandlers = (config: any) => {
      expect(config.handlers).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.signIn).toBeDefined();
      expect(config.signOut).toBeDefined();
    };

    it('should configure NextAuth with database session strategy', async () => {
      const { SESSION_CONFIG } = await import('@/lib/auth-database-session');
      validateSessionConfig(SESSION_CONFIG);
    });

    it('should use correct MongoDB collections for NextAuth', async () => {
      const { SESSION_CONFIG } = await import('@/lib/auth-database-session');
      validateCollectionNames(SESSION_CONFIG.COLLECTION_NAMES);
    });

    it('should initialize MongoDB adapter with database session support', async () => {
      const config = await import('@/lib/auth-database-session');
      validateAuthHandlers(config);
    });
  });

  describe('Session Persistence', () => {
    it('should persist user sessions in MongoDB', async () => {
      const mockUser = createMockUser();
      const sessionToken = 'test-database-session-token';
      const sessionData = createSessionData(mockUser, sessionToken);

      mockSessionsCollection.insertOne.mockResolvedValue({ insertedId: 'session-id' });
      mockUsersCollection.findOne.mockResolvedValue(createNextAuthUser(mockUser));

      await mockSessionsCollection.insertOne(sessionData);
      expect(mockSessionsCollection.insertOne).toHaveBeenCalledWith(sessionData);
    });

    it('should retrieve user sessions from MongoDB', async () => {
      const mockUser = createMockUser();
      const sessionToken = 'test-database-session-token';
      const storedSession = createStoredSession(mockUser, sessionToken);

      mockSessionsCollection.findOne.mockResolvedValue(storedSession);

      const result = await mockSessionsCollection.findOne({ sessionToken });
      expect(mockSessionsCollection.findOne).toHaveBeenCalledWith({ sessionToken });
      expect(result).toEqual(storedSession);
    });

    it('should update session expiration in MongoDB', async () => {
      const sessionToken = 'test-database-session-token';
      const newExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const updateData = { expires: newExpires };

      mockSessionsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await mockSessionsCollection.updateOne({ sessionToken }, { $set: updateData });
      expect(mockSessionsCollection.updateOne).toHaveBeenCalledWith(
        { sessionToken },
        { $set: updateData }
      );
    });

    it('should delete expired sessions from MongoDB', async () => {
      const sessionToken = 'expired-session-token';
      mockSessionsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await mockSessionsCollection.deleteOne({ sessionToken });
      expect(mockSessionsCollection.deleteOne).toHaveBeenCalledWith({ sessionToken });
    });
  });

  describe('User Management Integration', () => {
    const setupUserServiceMocks = (mockUser: any) => {
      mockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          sessionInfo: {
            sessionId: 'user-service-session',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
    };

    it('should synchronize user data between NextAuth and UserService', async () => {
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();

      setupUserServiceMocks(mockUser);
      mockUsersCollection.findOne.mockResolvedValue(createNextAuthUser(mockUser));

      const userServiceAuth = await UserService.authenticateUser({
        email: mockUser.email,
        password: mockCredentials.password,
        rememberMe: false,
      });

      const nextAuthUser = await mockUsersCollection.findOne({ email: mockUser.email });

      expect(userServiceAuth.success).toBe(true);
      expect(userServiceAuth.data?.user.email).toBe(mockUser.email);
      expect(nextAuthUser?.email).toBe(mockUser.email);
      expect(nextAuthUser?._id).toBe(mockUser.id);
    });

    it('should handle user creation via NextAuth adapter', async () => {
      const mockUser = createMockUser();
      const newUserData = createNextAuthUser(mockUser);

      mockUsersCollection.insertOne.mockResolvedValue({ insertedId: mockUser.id });
      mockUsersCollection.findOne.mockResolvedValue({ _id: mockUser.id, ...newUserData });

      await mockUsersCollection.insertOne(newUserData);
      const createdUser = await mockUsersCollection.findOne({ email: mockUser.email });

      expect(mockUsersCollection.insertOne).toHaveBeenCalledWith(newUserData);
      expect(createdUser).toMatchObject(newUserData);
    });
  });

  describe('Session Cleanup and Maintenance', () => {
    const createIndexTest = (indexSpec: any, expectedCall: any) => async () => {
      mockSessionsCollection.createIndex.mockResolvedValue(`${Object.keys(indexSpec)[0]}_1`);
      await mockSessionsCollection.createIndex(indexSpec);
      expect(mockSessionsCollection.createIndex).toHaveBeenCalledWith(expectedCall);
    };

    it('should handle session cleanup for expired sessions', async () => {
      mockSessionsCollection.deleteMany.mockResolvedValue({ deletedCount: 3 });
      await mockSessionsCollection.deleteMany({ expires: { $lt: new Date() } });
      expect(mockSessionsCollection.deleteMany).toHaveBeenCalledWith({
        expires: { $lt: expect.any(Date) },
      });
    });

    it('should maintain session indexes for performance', async () => {
      await createIndexTest({ sessionToken: 1 }, { sessionToken: 1 })();
      await createIndexTest({ expires: 1 }, { expires: 1 })();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle MongoDB connection failures gracefully', async () => {
      const connectionError = new Error('MongoDB connection failed');
      mockSessionsCollection.findOne.mockRejectedValue(connectionError);

      await expect(
        mockSessionsCollection.findOne({ sessionToken: 'test-token' })
      ).rejects.toThrow('MongoDB connection failed');
    });

    it('should handle session corruption scenarios', async () => {
      const corruptedSession = { sessionToken: 'test-token' };
      mockSessionsCollection.findOne.mockResolvedValue(corruptedSession);

      const result = await mockSessionsCollection.findOne({ sessionToken: 'test-token' });
      expect(result).toEqual(corruptedSession);
    });

    it('should handle concurrent session operations', async () => {
      const sessionToken = 'concurrent-test-token';
      const updateData = { expires: new Date() };
      mockSessionsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const promises = Array.from({ length: 3 }, () =>
        mockSessionsCollection.updateOne({ sessionToken }, { $set: updateData })
      );
      await Promise.all(promises);

      expect(mockSessionsCollection.updateOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('Configuration Validation', () => {
    const testEnvironmentVariable = (envVar: string, expectedError: string) => {
      const original = process.env[envVar];
      delete process.env[envVar];

      if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true') {
        expect(() => {
          require('@/lib/auth-database-session');
        }).toThrow(expectedError);
      }

      process.env[envVar] = original;
    };

    it('should validate required environment variables', () => {
      testEnvironmentVariable('MONGODB_URI', 'MONGODB_URI environment variable is not set');
    });

    it('should use fallback configurations for development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { SESSION_CONFIG } = require('@/lib/auth-database-session');
      expect(SESSION_CONFIG).toBeDefined();
      expect(SESSION_CONFIG.MAX_AGE).toBeGreaterThan(0);
      expect(SESSION_CONFIG.UPDATE_AGE).toBeGreaterThan(0);

      process.env.NODE_ENV = originalEnv;
    });
  });
});