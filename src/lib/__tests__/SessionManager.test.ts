import { SessionManager } from '../auth/SessionManager';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('SessionManager', () => {
  let mongoServer: MongoMemoryServer;
  let sessionManager: SessionManager;

  beforeAll(async () => {
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    sessionManager = new SessionManager();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Only clear sessions if we have a connection
    if (mongoose.connection.readyState === 1) {
      try {
        await sessionManager.clearAllSessions();
      } catch (error) {
        console.warn('Failed to clear sessions in beforeEach:', error);
      }
    }
  });

  describe('Session creation', () => {
    it('should create a new session with valid data', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      const sessionId = await sessionManager.createSession(userData);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(20);
    });

    it('should create sessions with custom expiration dates', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };
      const customExpiration = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      const sessionId = await sessionManager.createSession(userData, customExpiration);
      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.expiresAt.getTime()).toBe(customExpiration.getTime());
    });

    it('should create unique session IDs for different users', async () => {
      const userData1 = {
        userId: '507f1f77bcf86cd799439011',
        email: 'user1@example.com',
        subscriptionTier: 'free' as const
      };
      const userData2 = {
        userId: '507f1f77bcf86cd799439012',
        email: 'user2@example.com',
        subscriptionTier: 'premium' as const
      };

      const sessionId1 = await sessionManager.createSession(userData1);
      const sessionId2 = await sessionManager.createSession(userData2);

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('Session retrieval', () => {
    it('should retrieve valid sessions', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'premium' as const
      };

      const sessionId = await sessionManager.createSession(userData);
      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session!.userId).toBe(userData.userId);
      expect(session!.email).toBe(userData.email);
      expect(session!.subscriptionTier).toBe(userData.subscriptionTier);
    });

    it('should return null for non-existent sessions', async () => {
      const session = await sessionManager.getSession('non-existent-session-id');
      expect(session).toBeNull();
    });

    it('should return null for expired sessions', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };
      const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago

      const sessionId = await sessionManager.createSession(userData, expiredDate);
      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeNull();
    });

    it('should automatically clean up expired sessions during retrieval', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };
      const expiredDate = new Date(Date.now() - 1000);

      const sessionId = await sessionManager.createSession(userData, expiredDate);
      await sessionManager.getSession(sessionId); // This should trigger cleanup

      // Verify session was removed from database
      const directQuery = await sessionManager.getSessionFromDb(sessionId);
      expect(directQuery).toBeNull();
    });
  });

  describe('Session validation', () => {
    it('should validate session format', () => {
      expect(sessionManager.isValidSessionId('valid-session-id-format')).toBe(true);
      expect(sessionManager.isValidSessionId('')).toBe(false);
      expect(sessionManager.isValidSessionId('short')).toBe(false);
      expect(sessionManager.isValidSessionId(null as any)).toBe(false);
      expect(sessionManager.isValidSessionId(undefined as any)).toBe(false);
    });

    it('should validate user data', () => {
      const validData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      const invalidData = [
        { ...validData, userId: '' },
        { ...validData, email: 'invalid-email' },
        { ...validData, subscriptionTier: 'invalid' as any },
        { ...validData, userId: undefined },
      ];

      expect(sessionManager.isValidUserData(validData)).toBe(true);
      invalidData.forEach(data => {
        expect(sessionManager.isValidUserData(data)).toBe(false);
      });
    });
  });

  describe('Session deletion', () => {
    it('should delete existing sessions', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      const sessionId = await sessionManager.createSession(userData);
      const deleteResult = await sessionManager.deleteSession(sessionId);

      expect(deleteResult).toBe(true);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should return false when deleting non-existent sessions', async () => {
      const deleteResult = await sessionManager.deleteSession('non-existent-id');
      expect(deleteResult).toBe(false);
    });

    it('should delete all sessions for a user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const userData = {
        userId,
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      // Create multiple sessions for the same user
      const sessionId1 = await sessionManager.createSession(userData);
      const sessionId2 = await sessionManager.createSession(userData);

      const deleteCount = await sessionManager.deleteAllUserSessions(userId);
      expect(deleteCount).toBe(2);

      // Verify sessions are deleted
      const session1 = await sessionManager.getSession(sessionId1);
      const session2 = await sessionManager.getSession(sessionId2);
      expect(session1).toBeNull();
      expect(session2).toBeNull();
    });
  });

  describe('Session updates', () => {
    it('should update session expiration', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      const sessionId = await sessionManager.createSession(userData);
      const newExpiration = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours

      const updateResult = await sessionManager.updateSessionExpiration(sessionId, newExpiration);
      expect(updateResult).toBe(true);

      const session = await sessionManager.getSession(sessionId);
      expect(session!.expiresAt.getTime()).toBe(newExpiration.getTime());
    });

    it('should update user data in session', async () => {
      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      const sessionId = await sessionManager.createSession(userData);
      const updatedData = {
        ...userData,
        subscriptionTier: 'premium' as const
      };

      const updateResult = await sessionManager.updateSessionData(sessionId, updatedData);
      expect(updateResult).toBe(true);

      const session = await sessionManager.getSession(sessionId);
      expect(session!.subscriptionTier).toBe('premium');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const originalConnection = mongoose.connection;
      
      // Mock a database error
      jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const userData = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free' as const
      };

      await expect(sessionManager.createSession(userData))
        .rejects
        .toThrow('Database connection not available');

      // Restore original connection
      jest.restoreAllMocks();
    });

    it('should handle invalid session data gracefully', async () => {
      const invalidData = {
        userId: '',
        email: 'invalid-email',
        subscriptionTier: 'invalid' as any
      };

      await expect(sessionManager.createSession(invalidData))
        .rejects
        .toThrow('Invalid user data provided');
    });
  });
});