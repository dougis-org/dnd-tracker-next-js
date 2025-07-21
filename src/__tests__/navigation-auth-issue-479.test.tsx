import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/dashboard',
}));

// Mock next-auth/react
jest.mock('next-auth/react');

describe('Issue #479 - Left Navigation Authentication', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockPush = jest.fn();

  // Common authenticated session mock data
  const authenticatedSession = {
    data: {
      user: { id: '1', name: 'Test User', email: 'test@example.com' }
    },
    status: 'authenticated' as const,
  };

  const setupMocks = () => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  };

  const setupCharacterPageMocks = () => {
    // Mock the hooks and components for characters page
    jest.doMock('../app/characters/hooks/useCharacterPageActions', () => ({
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

    jest.doMock('@/components/character/CharacterListView', () => ({
      CharacterListView: () => <div data-testid="character-list">Character List</div>
    }));

    jest.doMock('@/components/forms/character/CharacterCreationForm', () => ({
      CharacterCreationForm: () => <div data-testid="character-form">Character Form</div>
    }));
  };

  const testNoAppLayoutDuplication = () => {
    const appLayouts = screen.queryAllByTestId('app-layout');
    expect(appLayouts.length).toBeLessThanOrEqual(1);
  };

  const testAuthenticatedUserAccess = (pageName: string) => {
    mockUseSession.mockReturnValue(authenticatedSession);
  };

  beforeEach(setupMocks);

  describe('Dashboard Page Authentication', () => {
    it('should not wrap content in duplicate AppLayout for authenticated users', async () => {
      testAuthenticatedUserAccess('Dashboard');

      const DashboardPage = (await import('../app/dashboard/page')).default;
      render(<DashboardPage />);

      testNoAppLayoutDuplication();
    });

    it('should not show sign-in message for authenticated users', async () => {
      testAuthenticatedUserAccess('Dashboard');

      const DashboardPage = (await import('../app/dashboard/page')).default;
      render(<DashboardPage />);

      expect(screen.queryByText(/please sign in/i)).not.toBeInTheDocument();
    });
  });

  describe('Characters Page Authentication', () => {
    beforeEach(setupCharacterPageMocks);

    it('should not wrap content in duplicate AppLayout for authenticated users', async () => {
      testAuthenticatedUserAccess('Characters');

      const CharactersPage = (await import('../app/characters/page')).default;
      render(<CharactersPage />);

      testNoAppLayoutDuplication();
    });

    it('should not redirect authenticated users to signin', async () => {
      testAuthenticatedUserAccess('Characters');

      const CharactersPage = (await import('../app/characters/page')).default;
      render(<CharactersPage />);

      expect(mockPush).not.toHaveBeenCalledWith('/signin');
    });
  });

  describe('Protected Routes Architecture', () => {
    it('should follow the same pattern as encounters page', async () => {
      const EncountersPage = (await import('../app/encounters/page')).default;
      render(<EncountersPage />);

      expect(screen.getByText('Encounters')).toBeInTheDocument();
      expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
    });
  });
});