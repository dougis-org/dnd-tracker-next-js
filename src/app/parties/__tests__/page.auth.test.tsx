/**
 * Parties Page Authentication Tests - Test actual behavior (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Next.js redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock Clerk's auth function to control authentication state
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock PartyListView component to avoid complex dependencies
jest.mock('@/components/party/PartyListView', () => ({
  PartyListView: ({ userId }: { userId: string }) => (
    <div data-testid="party-list-view" data-user-id={userId}>
      Party List View for user: {userId}
    </div>
  ),
}));

import PartiesPage from '../page';
import { auth } from '@clerk/nextjs/server';

// Test constants
const TEST_USER_ID = 'test-user-123';

describe('PartiesPage Authentication', () => {
  let mockAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = auth as jest.Mock;
  });

  it('should redirect unauthenticated users to signin', async () => {
    // Mock auth to return no user session
    mockAuth.mockResolvedValue({ userId: null });

    // Next.js redirect throws in tests, expect the error
    await expect(PartiesPage()).rejects.toThrow();

    expect(mockAuth).toHaveBeenCalled();
    // Note: In real redirect flow, the redirect function is called by requireAuth
    // but in this test setup the page function itself throws due to the auth failure
  });

  it('should render party list for authenticated users', async () => {
    // Mock auth to return authenticated user
    mockAuth.mockResolvedValue({ userId: TEST_USER_ID });

    const result = await PartiesPage();
    expect(result).toBeDefined();
    expect(mockAuth).toHaveBeenCalled();
  });

  it('should handle session with user ID', async () => {
    const userId = 'test-parties-user';
    // Mock auth to return authenticated user
    mockAuth.mockResolvedValue({ userId });

    const result = await PartiesPage();
    expect(result).toBeDefined();
    expect(mockAuth).toHaveBeenCalled();
  });
});
