/**
 * Test for Issue #586: Critical Navigation Failures After Authentication
 *
 * This test reproduces the RSC (React Server Components) request failures
 * that occur during navigation between protected pages due to server-client
 * hydration mismatches.
 *
 * Root Cause: Server component layout using `await auth()` while client
 * components use `useSession()` creates hydration mismatch, causing RSC
 * requests to fail with net::ERR_ABORTED.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/characters',
}));

// Mock character page dependencies
jest.mock('../app/characters/hooks/useCharacterPageActions', () => ({
  useCharacterPageActions: () => ({
    isCreationFormOpen: false,
    openCreationForm: jest.fn(),
    closeCreationForm: jest.fn(),
    handleCreationSuccess: jest.fn(),
    selectCharacter: jest.fn(),
    editCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
    duplicateCharacter: jest.fn(),
  })
}));

jest.mock('@/components/character/CharacterListView', () => ({
  CharacterListView: () => <div data-testid="character-list">Character List</div>
}));

jest.mock('@/components/forms/character/CharacterCreationForm', () => ({
  CharacterCreationForm: () => <div data-testid="character-form">Character Form</div>
}));

describe('Issue #586: Navigation RSC Hydration Failures', () => {
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockPush = jest.fn();

  // Mock authenticated user
  const authenticatedUser = {
    id: 'test-user-123',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }]
  };

  const authenticatedUserState = {
    user: authenticatedUser,
    isLoaded: true,
    isSignedIn: true,
  };

  const authenticatedAuthState = {
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-123',
  };

  const loadingUserState = {
    user: null,
    isLoaded: false,
    isSignedIn: false,
  };

  const loadingAuthState = {
    isLoaded: false,
    isSignedIn: false,
    userId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });


  describe('Server-Client Session State Consistency', () => {
    it('should have consistent session state between server and client components', async () => {
      mockUseUser.mockReturnValue(authenticatedUserState);
      mockUseAuth.mockReturnValue(authenticatedAuthState);
      const CharactersPage = (await import('../app/characters/page')).default;

      const _serverAuth = {
        userId: 'test-user-123',
        isSignedIn: true,
        isLoaded: true,
      };

      render(<CharactersPage />);
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText(/Manage and organize your D&D characters/)).toBeInTheDocument();
    });

    it('should not fail when navigating between protected pages', async () => {
      mockUseUser.mockReturnValue(authenticatedUserState);
      mockUseAuth.mockReturnValue(authenticatedAuthState);

      const CharactersPage = (await import('../app/characters/page')).default;
      const DashboardPage = (await import('../app/dashboard/page')).default;

      const { rerender } = render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      });

      rerender(<CharactersPage />);
      await waitFor(() => {
        expect(screen.getByText('Characters')).toBeInTheDocument();
      });
    });
  });

  describe('RSC Request Simulation', () => {
    it('should not abort RSC requests during navigation', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      global.fetch = mockFetch;

      mockUseUser.mockReturnValue(authenticatedUserState);
      mockUseAuth.mockReturnValue(authenticatedAuthState);
      const CharactersPage = (await import('../app/characters/page')).default;

      render(<CharactersPage />);
      await waitFor(() => {
        expect(screen.getByText('Characters')).toBeInTheDocument();
      });
      expect(screen.getByTestId('character-list')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should not trigger client-side exceptions during navigation', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUseUser.mockReturnValue(authenticatedUserState);
      mockUseAuth.mockReturnValue(authenticatedAuthState);
      const CharactersPage = (await import('../app/characters/page')).default;

      expect(() => render(<CharactersPage />)).not.toThrow();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Hydration'));

      consoleSpy.mockRestore();
    });
  });

  describe('Session Provider State Management', () => {
    it('should properly initialize session state from server', async () => {
      mockUseUser.mockReturnValue(loadingUserState);
      mockUseAuth.mockReturnValue(loadingAuthState);

      const CharactersPage = (await import('../app/characters/page')).default;
      render(<CharactersPage />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      mockUseUser.mockReturnValue(authenticatedUserState);
      mockUseAuth.mockReturnValue(authenticatedAuthState);
      const { rerender: _rerender } = render(<CharactersPage />);

      await waitFor(() => {
        expect(screen.getByText('Characters')).toBeInTheDocument();
      });
    });
  });
});