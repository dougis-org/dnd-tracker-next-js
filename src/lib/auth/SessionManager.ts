import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

interface ISession extends Document {
  sessionId: string;
  userId: string;
  email: string;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium', 'pro', 'enterprise'],
    default: 'free'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for efficient queries
SessionSchema.index({ userId: 1, expiresAt: 1 });

const Session = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export interface UserData {
  userId: string;
  email: string;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
}

export interface SessionData extends UserData {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
}

export class SessionManager {
  private static readonly DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly MIN_SESSION_ID_LENGTH = 32;

  /**
   * Creates a new session for the user
   */
  async createSession(
    userData: UserData, 
    expiresAt?: Date,
    rememberMe: boolean = false
  ): Promise<string> {
    if (!this.isValidUserData(userData)) {
      throw new Error('Invalid user data provided');
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    const sessionId = this.generateSecureSessionId();
    const sessionExpiry = expiresAt || new Date(
      Date.now() + (rememberMe ? SessionManager.REMEMBER_ME_DURATION : SessionManager.DEFAULT_SESSION_DURATION)
    );

    try {
      const session = new Session({
        sessionId,
        userId: userData.userId,
        email: userData.email,
        subscriptionTier: userData.subscriptionTier,
        expiresAt: sessionExpiry
      });

      await session.save();
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Retrieves session data and automatically cleans up expired sessions
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.isValidSessionId(sessionId)) {
      return null;
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const session = await Session.findOne({ 
        sessionId,
        expiresAt: { $gt: new Date() } // Only get non-expired sessions
      });

      if (!session) {
        // Clean up expired session if it exists
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last accessed time
      await Session.updateOne(
        { sessionId },
        { lastAccessedAt: new Date() }
      );

      return {
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        subscriptionTier: session.subscriptionTier,
        expiresAt: session.expiresAt,
        lastAccessedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Gets session directly from database without expiration checks (for testing)
   */
  async getSessionFromDb(sessionId: string): Promise<ISession | null> {
    if (!mongoose.connection.readyState) {
      return null;
    }

    try {
      return await Session.findOne({ sessionId });
    } catch (error) {
      console.error('Failed to retrieve session from DB:', error);
      return null;
    }
  }

  /**
   * Deletes a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isValidSessionId(sessionId)) {
      return false;
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await Session.deleteOne({ sessionId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Deletes all sessions for a specific user
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    if (!userId) {
      return 0;
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await Session.deleteMany({ userId });
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Failed to delete user sessions:', error);
      return 0;
    }
  }

  /**
   * Updates session expiration time
   */
  async updateSessionExpiration(sessionId: string, newExpiration: Date): Promise<boolean> {
    if (!this.isValidSessionId(sessionId)) {
      return false;
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await Session.updateOne(
        { sessionId },
        { expiresAt: newExpiration }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to update session expiration:', error);
      return false;
    }
  }

  /**
   * Updates user data in session
   */
  async updateSessionData(sessionId: string, userData: UserData): Promise<boolean> {
    if (!this.isValidSessionId(sessionId) || !this.isValidUserData(userData)) {
      return false;
    }

    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await Session.updateOne(
        { sessionId },
        {
          email: userData.email,
          subscriptionTier: userData.subscriptionTier,
          lastAccessedAt: new Date()
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to update session data:', error);
      return false;
    }
  }

  /**
   * Clears all sessions from the database (for testing)
   */
  async clearAllSessions(): Promise<void> {
    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      await Session.deleteMany({});
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
      throw error;
    }
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await Session.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Validates session ID format
   */
  isValidSessionId(sessionId: any): boolean {
    return (
      typeof sessionId === 'string' &&
      sessionId.length >= SessionManager.MIN_SESSION_ID_LENGTH &&
      /^[a-zA-Z0-9]+$/.test(sessionId)
    );
  }

  /**
   * Validates user data structure
   */
  isValidUserData(userData: any): boolean {
    if (!userData || typeof userData !== 'object') {
      return false;
    }

    const { userId, email, subscriptionTier } = userData;

    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return false;
    }

    // Validate email
    if (!email || typeof email !== 'string' || !this.isValidEmail(email)) {
      return false;
    }

    // Validate subscription tier
    const validTiers = ['free', 'premium', 'pro', 'enterprise'];
    if (!subscriptionTier || !validTiers.includes(subscriptionTier)) {
      return false;
    }

    return true;
  }

  /**
   * Generates a cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}