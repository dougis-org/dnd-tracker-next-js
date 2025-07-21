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

  describe('Dashboard Page Authentication', () => {
    it('should not wrap content in duplicate AppLayout for authenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' }
        },
        status: 'authenticated',
      });

      // Import the corrected dashboard page
      const DashboardPage = (await import('../app/dashboard/page')).default;

      render(<DashboardPage />);

      // Should not have nested AppLayout components
      const appLayouts = screen.queryAllByTestId('app-layout');
      expect(appLayouts.length).toBeLessThanOrEqual(1);
    });

    it('should not show sign-in message for authenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' }
        },
        status: 'authenticated',
      });

      // Import the corrected dashboard page
      const DashboardPage = (await import('../app/dashboard/page')).default;

      render(<DashboardPage />);

      // Should not show sign-in message
      expect(screen.queryByText(/please sign in/i)).not.toBeInTheDocument();
    });
  });

  describe('Characters Page Authentication', () => {
    it('should not wrap content in duplicate AppLayout for authenticated users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' }
        },
        status: 'authenticated',
      });

      // Mock the hooks for characters page
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

      // Mock the CharacterListView component
      jest.doMock('@/components/character/CharacterListView', () => ({
        CharacterListView: () => <div data-testid="character-list">Character List</div>
      }));

      // Mock the CharacterCreationForm component
      jest.doMock('@/components/forms/character/CharacterCreationForm', () => ({
        CharacterCreationForm: () => <div data-testid="character-form">Character Form</div>
      }));

      // Import the corrected characters page
      const CharactersPage = (await import('../app/characters/page')).default;

      render(<CharactersPage />);

      // Should not have nested AppLayout components
      const appLayouts = screen.queryAllByTestId('app-layout');
      expect(appLayouts.length).toBeLessThanOrEqual(1);
    });

    it('should not redirect authenticated users to signin', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' }
        },
        status: 'authenticated',
      });

      // Import the corrected characters page
      const CharactersPage = (await import('../app/characters/page')).default;

      render(<CharactersPage />);

      // Should not call router.push('/signin')
      expect(mockPush).not.toHaveBeenCalledWith('/signin');
    });
  });

  describe('Protected Routes Architecture', () => {
    it('should follow the same pattern as encounters page', async () => {
      // The encounters page should be the correct pattern - no AppLayout wrapper
      const EncountersPage = (await import('../app/encounters/page')).default;

      render(<EncountersPage />);

      // Should have page content without AppLayout wrapper
      expect(screen.getByText('Encounters')).toBeInTheDocument();
      // Should not have AppLayout test id since it's not wrapping
      expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
    });
  });
});