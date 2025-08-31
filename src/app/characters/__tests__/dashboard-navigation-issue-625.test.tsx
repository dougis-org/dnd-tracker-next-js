import { render, screen } from '@testing-library/react';
import CharactersPage from '../page';

// Mock useAuth and useUser from Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseAuth = require('@clerk/nextjs').useAuth as jest.Mock;
const mockUseUser = require('@clerk/nextjs').useUser as jest.Mock;

// Mock the dependencies
jest.mock('../hooks/useCharacterPageActions', () => ({
  useCharacterPageActions: () => ({
    isCreationFormOpen: false,
    openCreationForm: jest.fn(),
    closeCreationForm: jest.fn(),
    selectCharacter: jest.fn(),
    editCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
    duplicateCharacter: jest.fn(),
    handleCreationSuccess: jest.fn(),
  }),
}));

jest.mock('@/components/character/CharacterListView', () => ({
  CharacterListView: () => <div data-testid="character-list">Character List</div>,
}));

jest.mock('@/components/forms/character/CharacterCreationForm', () => ({
  CharacterCreationForm: () => <div data-testid="creation-form">Creation Form</div>,
}));

const mockAuthState = {
  userId: 'user123',
  isSignedIn: true,
  isLoaded: true,
};

const mockUserState = {
  user: {
    id: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  },
  isLoaded: true,
  isSignedIn: true,
};

describe('Issue #625: Dashboard Navigation - Characters Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    // Default to authenticated state
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseUser.mockReturnValue(mockUserState);
  });

  test('should render Characters page without client-side errors', () => {
    // This test should fail if the client component has metadata export issues
    expect(() => {
      render(<CharactersPage />);
    }).not.toThrow();

    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Manage and organize your D&D characters')).toBeInTheDocument();
    expect(screen.getByText('Create Character')).toBeInTheDocument();
    expect(screen.getByTestId('character-list')).toBeInTheDocument();
  });

  test('should handle loading state properly', () => {
    // Mock loading state
    mockUseAuth.mockReturnValue({
      userId: null,
      isSignedIn: false,
      isLoaded: false
    });
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    });

    render(<CharactersPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should not export metadata from client component', () => {
    // This test verifies that the page doesn't have invalid metadata exports
    const pageModule = require('../page');

    // Client components should not export metadata
    expect(pageModule.metadata).toBeUndefined();

    // The _metadata should be internal only and not exported
    expect(typeof pageModule._metadata).toBe('undefined');
  });
});