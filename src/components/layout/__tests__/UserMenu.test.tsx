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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
    } as any);
  });

  describe('User Information Display', () => {
    test('displays user name when available', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    test('displays user email when name is not available', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: null,
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('displays placeholder when user has no name or email', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: null,
          emailAddresses: [],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('displays loading state when session status is loading', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      } as any);

      render(<UserMenu />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('displays nothing when not authenticated', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any);

      render(<UserMenu />);
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });
  });

  describe('User Avatar', () => {
    test('renders user avatar placeholder', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('h-8 w-8 rounded-full bg-muted');
    });
  });

  describe('Sign Out Functionality', () => {
    test('calls signOut when sign out button is clicked', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
      fireEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
    });

    test('sign out button has correct styling', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
      expect(signOutButton).toHaveClass(
        'w-full text-left px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors'
      );
    });
  });

  describe('Layout and Styling', () => {
    test('has correct container styling', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const container = screen.getByTestId('user-menu');
      expect(container).toHaveClass('border-t border-border p-4');
    });

    test('user info has proper layout classes', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const userInfo = screen.getByTestId('user-info');
      expect(userInfo).toHaveClass('flex-1 min-w-0');
    });

    test('user name has correct text styling', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const userName = screen.getByText('John');
      expect(userName).toHaveClass('text-sm font-medium text-foreground truncate');
    });

    test('user email has correct text styling', () => {
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const userEmail = screen.getByText('john@example.com');
      expect(userEmail).toHaveClass('text-xs text-muted-foreground truncate');
    });
  });

  describe('Edge Cases', () => {
    test('handles session data with null user', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any);

      render(<UserMenu />);
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    test('handles very long user names with truncation', () => {
      const longName = 'A'.repeat(100);
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: longName,
          emailAddresses: [{ emailAddress: 'john@example.com' }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const userName = screen.getByText(longName);
      expect(userName).toHaveClass('truncate');
    });

    test('handles very long email addresses with truncation', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      mockUseUser.mockReturnValue({
        user: {
          id: 'user_123',
          firstName: 'John',
          emailAddresses: [{ emailAddress: longEmail }],
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      render(<UserMenu />);
      const userEmail = screen.getByText(longEmail);
      expect(userEmail).toHaveClass('truncate');
    });
  });
});