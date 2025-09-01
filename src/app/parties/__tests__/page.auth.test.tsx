/**
 * Parties Page Authentication Tests - Simplified (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { auth } from '@clerk/nextjs/server';

// Test constants
const TEST_USER_ID = 'test-user-123';

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

// Mock centralized auth utilities BEFORE importing the page
const mockGetAuthenticatedUserId = jest.fn();

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: mockGetAuthenticatedUserId,
  requireAuth: jest.fn(),
  isAuthenticated: jest.fn(),
  buildSignInUrl: jest.fn(),
}));

// Import after mocking
import PartiesPage from '../page';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('PartiesPage Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect unauthenticated users to signin', async () => {
    // Mock centralized auth to throw redirect
    mockGetAuthenticatedUserId.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    
    await expect(PartiesPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith('/parties');
  });

  it('should render party list for authenticated users', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(TEST_USER_ID);
    
    const result = await PartiesPage();
    expect(result).toBeDefined();
    expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith('/parties');
  });

  it('should handle session with user ID', async () => {
    const userId = 'test-parties-user';
    mockGetAuthenticatedUserId.mockResolvedValue(userId);
    
    const result = await PartiesPage();
    expect(result).toBeDefined();
    expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith('/parties');
  });
});
