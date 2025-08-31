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

// Mock centralized auth utilities  
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(),
  requireAuth: jest.fn(),
  isAuthenticated: jest.fn(),
  buildSignInUrl: jest.fn(),
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
  let mockGetAuthenticatedUserId: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId = require('@/lib/auth').getAuthenticatedUserId;
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
    const userId = SHARED_API_TEST_CONSTANTS.TEST_USER_ID;
    mockGetAuthenticatedUserId.mockResolvedValue(userId);
    
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
