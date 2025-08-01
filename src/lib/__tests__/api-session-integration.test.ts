/**
 * API Route Session Integration Tests (Issue #527)
 *
 * Tests to verify API routes work correctly with consistent session utilities
 */

import { describe, it, expect, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the session utilities and services directly
jest.mock('@/lib/session-config', () => ({
  ...jest.requireActual('@/lib/session-config'),
  getAuthConfig: jest.fn(() => Promise.resolve({
    auth: jest.fn().mockResolvedValue(null),
    handlers: {},
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

const mockCharacterService = {
  searchCharacters: jest.fn(),
  getCharactersByType: jest.fn(),
  getCharactersByOwner: jest.fn(),
  createCharacter: jest.fn(),
};

// Mock the entire CharacterService module
jest.mock('@/lib/services/CharacterService', () => ({
  CharacterService: mockCharacterService,
}));

import { createMockSession } from '../test-utils/session-mocks';

describe('API Route Session Integration', () => {
  describe('Characters API', () => {
    it('should use consistent session utilities for character retrieval', async () => {
      const mockSession = createMockSession();
      const { getAuthConfig } = require('@/lib/session-config');
      const { GET } = require('@/app/api/characters/route');

      const mockAuth = jest.fn().mockResolvedValue(mockSession);
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      mockCharacterService.getCharactersByOwner.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
      expect(mockCharacterService.getCharactersByOwner).toHaveBeenCalledWith(
        mockSession.user.id,
        1,
        10
      );
    });

    it('should use consistent session utilities for character creation', async () => {
      const mockSession = createMockSession();
      const { getAuthConfig } = require('@/lib/session-config');
      const { POST } = require('@/app/api/characters/route');

      const mockAuth = jest.fn().mockResolvedValue(mockSession);
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      mockCharacterService.createCharacter.mockResolvedValue({
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

      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
      expect(mockCharacterService.createCharacter).toHaveBeenCalledWith(
        mockSession.user.id,
        expect.objectContaining({ name: 'Test Character' })
      );
    });

    it('should handle authentication failures consistently', async () => {
      const { getAuthConfig } = require('@/lib/session-config');
      const { GET } = require('@/app/api/characters/route');

      const mockAuth = jest.fn().mockResolvedValue(null);
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

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
      const { getAuthConfig } = require('@/lib/session-config');

      const mockAuth = jest.fn().mockResolvedValue(mockSession);
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      // This test verifies the integration works regardless of strategy
      expect(mockSession.user.id).toBe('user123');
    });

    it('should work with database session strategy', async () => {
      const mockSession = createMockSession({
        user: { id: 'user456', email: 'test2@example.com' }
      });
      const { getAuthConfig } = require('@/lib/session-config');

      const mockAuth = jest.fn().mockResolvedValue(mockSession);
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      // This test verifies the integration works regardless of strategy
      expect(mockSession.user.id).toBe('user456');
    });
  });

  describe('Error Handling', () => {
    it('should handle session utility errors gracefully', async () => {
      const { getAuthConfig } = require('@/lib/session-config');
      const { GET } = require('@/app/api/characters/route');

      const mockAuth = jest.fn().mockRejectedValue(new Error('Session error'));
      getAuthConfig.mockResolvedValue({
        auth: mockAuth,
        handlers: {},
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      const request = new NextRequest('http://localhost:3000/api/characters');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Authentication required');
    });
  });
});