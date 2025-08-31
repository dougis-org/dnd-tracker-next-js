import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUser, useClerk } from '@clerk/nextjs';
import { UserMenu } from '../UserMenu';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  useClerk: jest.fn(),
}));

describe('UserMenu', () => {
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
  const mockUseClerk = useClerk as jest.MockedFunction<typeof useClerk>;
  const mockSignOut = jest.fn();

  const createMockUser = (overrides = {}) => ({
    id: 'user_123',
    firstName: 'John',
    emailAddresses: [{ emailAddress: 'john@example.com' }],
    ...overrides,
  });

  const setupAuthenticatedUser = (userOverrides = {}) => {
    mockUseUser.mockReturnValue({
      user: createMockUser(userOverrides),
      isLoaded: true,
      isSignedIn: true,
    } as any);
  };

  const setupUnauthenticatedUser = () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any);
  };

  const setupLoadingUser = () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
    } as any);
  });

  describe('User Information Display', () => {
    test('displays user name when available', () => {
      setupAuthenticatedUser();
      render(<UserMenu />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    test('displays user email when name is not available', () => {
      setupAuthenticatedUser({ firstName: null });
      render(<UserMenu />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('displays placeholder when user has no name or email', () => {
      setupAuthenticatedUser({ firstName: null, emailAddresses: [] });
      render(<UserMenu />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('displays loading state when session status is loading', () => {
      setupLoadingUser();
      render(<UserMenu />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('displays nothing when not authenticated', () => {
      setupUnauthenticatedUser();
      render(<UserMenu />);
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });
  });

  describe('User Avatar', () => {
    test('renders user avatar placeholder', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('h-8 w-8 rounded-full bg-muted');
    });
  });

  describe('Sign Out Functionality', () => {
    test('calls signOut when sign out button is clicked', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
      fireEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
    });

    test('sign out button has correct styling', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
      expect(signOutButton).toHaveClass(
        'w-full text-left px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors'
      );
    });
  });

  describe('Layout and Styling', () => {
    test('has correct container styling', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const container = screen.getByTestId('user-menu');
      expect(container).toHaveClass('border-t border-border p-4');
    });

    test('user info has proper layout classes', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const userInfo = screen.getByTestId('user-info');
      expect(userInfo).toHaveClass('flex-1 min-w-0');
    });

    test('user name has correct text styling', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const userName = screen.getByText('John');
      expect(userName).toHaveClass('text-sm font-medium text-foreground truncate');
    });

    test('user email has correct text styling', () => {
      setupAuthenticatedUser();

      render(<UserMenu />);
      const userEmail = screen.getByText('john@example.com');
      expect(userEmail).toHaveClass('text-xs text-muted-foreground truncate');
    });
  });

  describe('Edge Cases', () => {
    test('handles session data with null user', () => {
      setupUnauthenticatedUser();

      render(<UserMenu />);
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    test('handles very long user names with truncation', () => {
      const longName = 'A'.repeat(100);
      setupAuthenticatedUser({ firstName: longName });

      render(<UserMenu />);
      const userName = screen.getByText(longName);
      expect(userName).toHaveClass('truncate');
    });

    test('handles very long email addresses with truncation', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      setupAuthenticatedUser({ emailAddresses: [{ emailAddress: longEmail }] });

      render(<UserMenu />);
      const userEmail = screen.getByText(longEmail);
      expect(userEmail).toHaveClass('truncate');
    });
  });
});