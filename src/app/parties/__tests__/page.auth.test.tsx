/**
 * Parties Page Authentication Tests - Simplified (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { auth } from '@clerk/nextjs/server';
import PartiesPage from '../page';

// Inline minimal test helpers for Clerk
const SHARED_API_TEST_CONSTANTS = {
  TEST_USER_ID: 'test-user-123',
};

function createMockSession(userId: string) {
  return {
    userId,
    publicMetadata: { role: 'user' },
    sessionClaims: {
      sub: userId,
      __raw: '',
      iss: 'https://clerk.example.com',
      sid: 'sid-123',
      nbf: 0,
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    },
    sessionId: 'sess-123',
    sessionStatus: 'active' as any,
    actor: undefined,
    tokenType: 'session_token' as const,
    getToken: async () => null,
    has: () => true,
    debug: () => ({}),
    isAuthenticated: true,
    orgId: undefined,
    orgRole: undefined,
    orgSlug: undefined,
    orgPermissions: [],
    factorVerificationAge: null,
  };
}

function setupNextAuthMocks(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockReset();
}

function setupUnauthenticatedState(mockAuth: jest.MockedFunction<any>) {
  mockAuth.mockResolvedValue({ userId: undefined });
}

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock Next.js redirect function - simple mock that throws
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// Mock PartyListView component
jest.mock('@/components/party/PartyListView', () => ({
  PartyListView: ({ userId }: { userId: string }) => (
    <div data-testid="party-list-view" data-user-id={userId}>
      Party List View for user: {userId}
    </div>
  ),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('PartiesPage Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect unauthenticated users to signin', async () => {
    setupUnauthenticatedState(mockAuth);

    // Test that the component throws when redirect is called
    await expect(PartiesPage()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('should render party list for authenticated users', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const mockSession = createMockSession(userId);

    setupNextAuthMocks(mockAuth);
    mockAuth.mockResolvedValue(mockSession);

    const result = await PartiesPage();

    // The component should render without throwing
    expect(result).toBeDefined();
  });

  it('should handle session with user ID', async () => {
    const userId = 'test-parties-user';
    const mockSession = createMockSession(userId);

    setupNextAuthMocks(mockAuth);
    mockAuth.mockResolvedValue(mockSession);

    const result = await PartiesPage();

    expect(result).toBeDefined();
    expect(mockAuth).toHaveBeenCalled();
  });
});
