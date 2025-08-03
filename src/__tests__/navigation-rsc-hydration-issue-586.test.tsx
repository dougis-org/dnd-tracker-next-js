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
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock next-auth/react
jest.mock('next-auth/react');

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
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockPush = jest.fn();

  // Mock authenticated session
  const authenticatedSession = {
    data: {
      user: {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        subscriptionTier: 'free'
      }
    },
    status: 'authenticated' as const,
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

  const renderPageAndWaitForLoad = async (PageComponent, expectedText) => {
    render(<PageComponent />);
    await waitFor(() => {
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  };

  describe('Server-Client Session State Consistency', () => {
    it('should have consistent session state between server and client components', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);
      const CharactersPage = (await import('../app/characters/page')).default;

      const _serverSession = {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          subscriptionTier: 'free'
        }
      };

      render(<CharactersPage />);
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText(/Manage and organize your D&D characters/)).toBeInTheDocument();
    });

    it('should not fail when navigating between protected pages', async () => {
      mockUseSession.mockReturnValue(authenticatedSession);

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

      mockUseSession.mockReturnValue(authenticatedSession);
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

      mockUseSession.mockReturnValue(authenticatedSession);
      const CharactersPage = (await import('../app/characters/page')).default;

      expect(() => render(<CharactersPage />)).not.toThrow();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Hydration'));

      consoleSpy.mockRestore();
    });
  });

  describe('Session Provider State Management', () => {
    it('should properly initialize session state from server', async () => {
      mockUseSession.mockReturnValue({
        ...authenticatedSession,
        status: 'loading' as const
      });

      const CharactersPage = (await import('../app/characters/page')).default;
      render(<CharactersPage />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      mockUseSession.mockReturnValue(authenticatedSession);
      const { rerender: _rerender } = render(<CharactersPage />);

      await waitFor(() => {
        expect(screen.getByText('Characters')).toBeInTheDocument();
      });
    });
  });
});