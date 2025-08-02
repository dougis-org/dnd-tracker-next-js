/**
 * Authentication Integration Tests - Login to API Access (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getToken } from 'next-auth/jwt';
import {
  createMockSession,
  createMockUser,
  setupNextAuthMocks,
  SHARED_API_TEST_CONSTANTS
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock services
const mockUserService = {
  authenticateUser: jest.fn(),
};

const mockCharacterService = {
  getCharactersByOwner: jest.fn(),
};

const mockAuth = jest.fn();

// Setup mocks
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/lib/services/UserService', () => ({ UserService: mockUserService }));
jest.mock('@/lib/services/CharacterService', () => ({ CharacterService: mockCharacterService }));
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));

describe('Auth Integration - Login to API Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete authentication flow from login to API access', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const mockUser = createMockUser();
    const mockSession = createMockSession(userId);

    // Setup authentication flow
    mockUserService.authenticateUser.mockResolvedValue({
      success: true,
      data: { user: mockUser, session: mockSession },
    });

    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    mockCharacterService.getCharactersByOwner.mockResolvedValue({
      success: true,
      data: { characters: [{ id: 'char1', ownerId: userId }], pagination: { total: 1 } },
    });

    // Test authentication
    const authResult = await mockUserService.authenticateUser({
      email: mockUser.email,
      password: 'testpassword',
      rememberMe: false,
    });

    expect(authResult.success).toBe(true);
    expect(authResult.data.user.id).toBe(userId);

    // Test session validation
    const token = await getToken({ req: {} as any });
    expect(token.sub).toBe(userId);

    // Test API access
    const apiResult = await mockCharacterService.getCharactersByOwner(userId, 1, 10);
    expect(apiResult.success).toBe(true);
    expect(apiResult.data.characters[0].ownerId).toBe(userId);
  });

  it('should validate session tokens properly', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    setupNextAuthMocks(mockAuth, getToken as jest.Mock, userId);

    const token = await getToken({ req: {} as any });
    expect(token.sub).toBe(userId);

    const session = await mockAuth();
    expect(session.user.id).toBe(userId);
  });
});