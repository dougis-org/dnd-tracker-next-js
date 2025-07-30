/**
 * Comprehensive tests for session-utilities.ts (Issue #524)
 * Tests all session utility functions for enhanced error handling and functionality
 */

import {
  getCurrentSession,
  hasValidSession,
  getSessionUserId,
  getSessionUserTier,
} from '../session-utilities';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Session Utilities (Issue #524)', () => {
  let mockAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = jest.fn();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('getCurrentSession', () => {
    test('should return session when auth succeeds', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          subscriptionTier: 'premium',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await getCurrentSession(mockAuth);

      expect(result).toEqual(mockSession);
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    test('should return null when auth fails', async () => {
      mockAuth.mockRejectedValue(new Error('Auth error'));

      const result = await getCurrentSession(mockAuth);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting current session:',
        expect.any(Error)
      );
    });

    test('should return null when auth returns null', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getCurrentSession(mockAuth);

      expect(result).toBeNull();
    });
  });

  describe('hasValidSession', () => {
    test('should return true for valid session with user ID', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await hasValidSession(mockAuth);

      expect(result).toBe(true);
    });

    test('should return false for session without user ID', async () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await hasValidSession(mockAuth);

      expect(result).toBe(false);
    });

    test('should return false for null session', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await hasValidSession(mockAuth);

      expect(result).toBe(false);
    });

    test('should return false for session without user', async () => {
      const mockSession = {};
      mockAuth.mockResolvedValue(mockSession);

      const result = await hasValidSession(mockAuth);

      expect(result).toBe(false);
    });

    test('should handle errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Session error'));

      const result = await hasValidSession(mockAuth);

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting current session:',
        expect.any(Error)
      );
    });
  });

  describe('getSessionUserId', () => {
    test('should return user ID from valid session', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserId(mockAuth);

      expect(result).toBe('user123');
    });

    test('should return null for session without user ID', async () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserId(mockAuth);

      expect(result).toBeNull();
    });

    test('should return null for null session', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getSessionUserId(mockAuth);

      expect(result).toBeNull();
    });

    test('should return null for session without user', async () => {
      const mockSession = {};
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserId(mockAuth);

      expect(result).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Session error'));

      const result = await getSessionUserId(mockAuth);

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting current session:',
        expect.any(Error)
      );
    });
  });

  describe('getSessionUserTier', () => {
    test('should return subscription tier from valid session', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          subscriptionTier: 'premium',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserTier(mockAuth);

      expect(result).toBe('premium');
    });

    test('should return "free" for session without subscription tier', async () => {
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserTier(mockAuth);

      expect(result).toBe('free');
    });

    test('should return "free" for null session', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getSessionUserTier(mockAuth);

      expect(result).toBe('free');
    });

    test('should return "free" for session without user', async () => {
      const mockSession = {};
      mockAuth.mockResolvedValue(mockSession);

      const result = await getSessionUserTier(mockAuth);

      expect(result).toBe('free');
    });

    test('should handle errors gracefully and return "free"', async () => {
      mockAuth.mockRejectedValue(new Error('Session error'));

      const result = await getSessionUserTier(mockAuth);

      expect(result).toBe('free');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting current session:',
        expect.any(Error)
      );
    });

    test('should handle various subscription tier values', async () => {
      const tiers = ['free', 'premium', 'enterprise', 'unlimited'];

      for (const tier of tiers) {
        const mockSession = {
          user: {
            id: 'user123',
            subscriptionTier: tier,
          },
        };
        mockAuth.mockResolvedValue(mockSession);

        const result = await getSessionUserTier(mockAuth);

        expect(result).toBe(tier);
        jest.clearAllMocks();
      }
    });
  });
});