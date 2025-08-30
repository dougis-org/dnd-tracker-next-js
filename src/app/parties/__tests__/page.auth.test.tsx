/**
 * Parties Page Authentication Tests - Simplified (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { auth } from '@clerk/nextjs/server';
import PartiesPage from '../page';
import {
  SHARED_API_TEST_CONSTANTS,
  createMockClerkSession,
  setupClerkMocks,
  setupClerkUnauthenticatedState,
} from '@/lib/test-utils/shared-clerk-test-helpers';

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
    setupClerkUnauthenticatedState(mockAuth);
    await expect(PartiesPage()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('should render party list for authenticated users', async () => {
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    const mockSession = createMockClerkSession(userId);
    setupClerkMocks(mockAuth);
    mockAuth.mockResolvedValue(mockSession);
    const result = await PartiesPage();
    expect(result).toBeDefined();
  });

  it('should handle session with user ID', async () => {
    const userId = 'test-parties-user';
    const mockSession = createMockClerkSession(userId);
    setupClerkMocks(mockAuth);
    mockAuth.mockResolvedValue(mockSession);
    const result = await PartiesPage();
    expect(result).toBeDefined();
    expect(mockAuth).toHaveBeenCalled();
  });
});
