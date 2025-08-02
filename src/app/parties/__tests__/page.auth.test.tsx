/**
 * Parties Page Authentication Tests - Simplified (Issue #536)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { auth } from '@/lib/auth';
import PartiesPage from '../page';
import {
  createMockSession,
  setupNextAuthMocks,
  setupUnauthenticatedState,
  SHARED_API_TEST_CONSTANTS
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock the auth function from Next Auth
jest.mock('@/lib/auth', () => ({
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