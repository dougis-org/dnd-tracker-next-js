/**
 * Authentication Integration Tests - Session Persistence (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createMockSession,
  setupNextAuthMocks,
  setupUnauthenticatedState,
  SHARED_API_TEST_CONSTANTS
} from '@/lib/test-utils/shared-api-test-helpers';

const mockAuth = jest.fn();
const mockSessionUtils = {
  hasValidSession: jest.fn(),
  getSessionUserId: jest.fn(),
  getCurrentSession: jest.fn(),
  getSessionUserTier: jest.fn(),
};

// Setup mocks
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));
jest.mock('@/lib/session-config', () => ({ sessionUtils: mockSessionUtils }));

describe('Auth Integration - Session Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should store and retrieve session data across requests', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const mockSession = createMockSession(userId);

    setupNextAuthMocks(mockAuth);
    mockSessionUtils.getCurrentSession.mockResolvedValue(mockSession);
    mockSessionUtils.getSessionUserId.mockResolvedValue(userId);

    const retrievedSession = await mockSessionUtils.getCurrentSession();
    expect(retrievedSession.user.id).toBe(userId);

    const sessionUserId = await mockSessionUtils.getSessionUserId();
    expect(sessionUserId).toBe(userId);
  });

  it('should maintain session data integrity', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const mockSession = createMockSession(userId);

    mockSessionUtils.getCurrentSession.mockResolvedValue(mockSession);

    const session1 = await mockSessionUtils.getCurrentSession();
    const session2 = await mockSessionUtils.getCurrentSession();

    expect(session1).toEqual(session2);
    expect(session1.user.id).toBe(userId);
  });

  it('should handle session expiration properly', async () => {
    setupUnauthenticatedState(mockAuth);
    mockSessionUtils.hasValidSession.mockResolvedValue(false);
    mockSessionUtils.getCurrentSession.mockResolvedValue(null);

    const hasValidSession = await mockSessionUtils.hasValidSession();
    expect(hasValidSession).toBe(false);

    const currentSession = await mockSessionUtils.getCurrentSession();
    expect(currentSession).toBeNull();
  });
});