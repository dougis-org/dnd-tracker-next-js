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

// Mock centralized auth utilities
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(),
  requireAuth: jest.fn(),
  isAuthenticated: jest.fn(),
  buildSignInUrl: jest.fn(),
}));

// Import after mocking
import PartiesPage from '../page';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('PartiesPage Authentication', () => {
  let mockGetAuthenticatedUserId: jest.Mock;
  let mockRedirect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions using require after they're mocked
    mockGetAuthenticatedUserId = require('@/lib/auth').getAuthenticatedUserId;
    mockRedirect = require('next/navigation').redirect;
    
    // Setup redirect to throw error like Next.js does
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT: ${url}`);
    });
  });

  it('should redirect unauthenticated users to signin', async () => {
    // Mock centralized auth to throw redirect
    mockGetAuthenticatedUserId.mockImplementation(() => {
      throw new Error('REDIRECT: /sign-in?redirect_url=%2Fparties');
    });
    
    await expect(PartiesPage()).rejects.toThrow('REDIRECT: /sign-in?redirect_url=%2Fparties');
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
