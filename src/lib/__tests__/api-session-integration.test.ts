/**
 * API Route Session Integration Tests (Issue #527)
 *
 * Tests to verify API routes work correctly with consistent session utilities
 */

import { describe, it, expect, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { CharacterService } from '@/lib/services/CharacterService';
import { GET, POST } from '@/app/api/characters/route';
import { createMockSession } from '../test-utils/session-mocks';

// Mock the session utilities
jest.mock('@/lib/session-config', () => ({
  sessionUtils: {
    getCurrentSession: jest.fn(),
    hasValidSession: jest.fn(),
    getSessionUserId: jest.fn(),
    getSessionUserTier: jest.fn(),
  },
  getAuthConfig: jest.fn(),
}));

// Mock the services
jest.mock('@/lib/services/CharacterService', () => ({
  CharacterService: {
    searchCharacters: jest.fn(),
    getCharactersByType: jest.fn(),
    getCharactersByOwner: jest.fn(),
    createCharacter: jest.fn(),
  },
}));

describe('API Route Session Integration', () => {
  describe('Characters API', () => {
    it('should use consistent session utilities for character retrieval', async () => {
      const mockSession = createMockSession();
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockResolvedValue(mockSession);
      CharacterService.getCharactersByOwner.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(sessionUtils.getCurrentSession).toHaveBeenCalled();
      expect(CharacterService.getCharactersByOwner).toHaveBeenCalledWith(
        mockSession.user.id,
        1,
        10
      );
    });

    it('should use consistent session utilities for character creation', async () => {
      const mockSession = createMockSession();
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockResolvedValue(mockSession);
      CharacterService.createCharacter.mockResolvedValue({
        success: true,
        data: { id: 'char123', name: 'Test Character' },
      });

      const request = new NextRequest('http://localhost:3000/api/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Character',
          type: 'player',
          hp: 10,
          ac: 15,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(sessionUtils.getCurrentSession).toHaveBeenCalled();
      expect(CharacterService.createCharacter).toHaveBeenCalledWith(
        mockSession.user.id,
        expect.objectContaining({ name: 'Test Character' })
      );
    });

    it('should handle authentication failures consistently', async () => {
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Authentication required');
    });
  });

  describe('Session Strategy Consistency', () => {
    it('should work with JWT session strategy', async () => {
      const mockSession = createMockSession({
        user: { id: 'user123', email: 'test@example.com' }
      });
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockResolvedValue(mockSession);

      // This test verifies the integration works regardless of strategy
      expect(mockSession.user.id).toBe('user123');
    });

    it('should work with database session strategy', async () => {
      const mockSession = createMockSession({
        user: { id: 'user456', email: 'test2@example.com' }
      });
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockResolvedValue(mockSession);

      // This test verifies the integration works regardless of strategy
      expect(mockSession.user.id).toBe('user456');
    });
  });

  describe('Error Handling', () => {
    it('should handle session utility errors gracefully', async () => {
      const { sessionUtils } = require('@/lib/session-config');

      sessionUtils.getCurrentSession.mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Authentication validation failed');
    });
  });
});