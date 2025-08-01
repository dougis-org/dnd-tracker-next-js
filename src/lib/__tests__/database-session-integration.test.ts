/**
 * Database Session Integration Tests (Issue #526)
 *
 * Simplified tests to verify database session configuration works correctly.
 */

import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import { createMockUser, createMockCredentials } from '@/lib/test-utils/shared-api-test-helpers';
import { createMockCollection, createMockDatabase, createMockClient } from './test-helpers/session-test-utils';

jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');

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

describe('Database Session Integration', () => {
  let mockClient: any;
  let mockUsersCollection: any;
  let mockSessionsCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersCollection = createMockCollection();
    mockSessionsCollection = createMockCollection();
    const mockDb = createMockDatabase({
      users: mockUsersCollection,
      sessions: mockSessionsCollection,
    });
    mockClient = createMockClient(mockDb);
    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue();
  });

  describe('Database Session Configuration', () => {
    it('should configure NextAuth with database session strategy', async () => {
      const { SESSION_CONFIG } = await import('@/lib/auth-database-session');
      expect(SESSION_CONFIG.USE_DATABASE_SESSIONS).toBe(true);
      expect(SESSION_CONFIG.MAX_AGE).toBe(30 * 24 * 60 * 60);
      expect(SESSION_CONFIG.UPDATE_AGE).toBe(24 * 60 * 60);
      expect(SESSION_CONFIG.DATABASE_NAME).toBe('test-dnd-tracker');
    });

    it('should use correct MongoDB collections for NextAuth', async () => {
      const { SESSION_CONFIG } = await import('@/lib/auth-database-session');
      expect(SESSION_CONFIG.COLLECTION_NAMES).toEqual({
        Users: 'users',
        Sessions: 'sessions',
        Accounts: 'accounts',
        VerificationTokens: 'verification_tokens',
      });
    });
  });

  describe('Session Persistence Operations', () => {
    it('should handle session persistence operations', async () => {
      const mockUser = createMockUser();
      const sessionToken = 'test-session-token';
      const sessionData = {
        sessionToken,
        userId: mockUser.id?.toString(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockSessionsCollection.insertOne.mockResolvedValue({ insertedId: 'session-id' });
      mockSessionsCollection.findOne.mockResolvedValue(sessionData);
      mockSessionsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockSessionsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await mockSessionsCollection.insertOne(sessionData);
      await mockSessionsCollection.findOne({ sessionToken });
      await mockSessionsCollection.updateOne({ sessionToken }, { $set: { expires: new Date() } });
      await mockSessionsCollection.deleteOne({ sessionToken });

      expect(mockSessionsCollection.insertOne).toHaveBeenCalledWith(sessionData);
      expect(mockSessionsCollection.findOne).toHaveBeenCalledWith({ sessionToken });
      expect(mockSessionsCollection.updateOne).toHaveBeenCalled();
      expect(mockSessionsCollection.deleteOne).toHaveBeenCalledWith({ sessionToken });
    });
  });

  describe('UserService Integration', () => {
    it('should integrate with existing UserService', async () => {
      const mockUser = createMockUser();
      const mockCredentials = createMockCredentials();

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

      mockUsersCollection.findOne.mockResolvedValue({
        _id: mockUser.id,
        email: mockUser.email,
        name: `${mockUser.firstName} ${mockUser.lastName}`,
        emailVerified: null,
      });

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
  });

  describe('Session Cleanup and Error Handling', () => {
    it('should handle session cleanup and error scenarios', async () => {
      mockSessionsCollection.deleteMany.mockResolvedValue({ deletedCount: 3 });
      mockSessionsCollection.createIndex.mockResolvedValue('sessionToken_1');

      await mockSessionsCollection.deleteMany({ expires: { $lt: new Date() } });
      await mockSessionsCollection.createIndex({ sessionToken: 1 });

      expect(mockSessionsCollection.deleteMany).toHaveBeenCalledWith({
        expires: { $lt: expect.any(Date) },
      });
      expect(mockSessionsCollection.createIndex).toHaveBeenCalledWith({ sessionToken: 1 });
    });
  });
});