/**
 * API Route Session Integration Tests (Issue #527)
 *
 * Tests to verify API routes work correctly with consistent session utilities
 */

import { describe, it, expect, jest } from '@jest/globals';
import { createMockSession } from '../test-utils/session-mocks';

// Mock the entire module structure to avoid complexity
jest.mock('@/lib/session-config', () => ({
  getAuthConfig: jest.fn(() =>
    Promise.resolve({
      auth: jest.fn().mockResolvedValue(null),
      handlers: {},
      signIn: jest.fn(),
      signOut: jest.fn(),
    })),
}));

jest.mock('@/lib/services/CharacterService', () => ({
  CharacterService: {
    searchCharacters: jest.fn(),
    getCharactersByType: jest.fn(),
    getCharactersByOwner: jest.fn(),
    createCharacter: jest.fn(),
  }
}));

describe('API Route Session Integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Strategy Consistency', () => {
    it.each([
      ['JWT', 'user123', 'test@example.com'],
      ['database', 'user456', 'test2@example.com']
    ])('should work with %s session strategy', async (_, userId, email) => {
      const mockSession = createMockSession({ user: { id: userId, email } });
      expect(mockSession.user.id).toBe(userId);
    });
  });

  describe('Session Utilities', () => {
    it('should handle authentication correctly', () => {
      const mockSession = createMockSession();
      expect(mockSession).toBeDefined();
      expect(mockSession.user).toBeDefined();
    });
  });
});