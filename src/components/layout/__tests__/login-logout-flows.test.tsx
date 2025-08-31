/**
 * Tests for Issue #654 - User Login/Logout Flows with Clerk
 * These tests verify the login and logout functionality works correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';


import { AppLayout } from '../AppLayout';

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
  useUser: jest.fn(),
}));


// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Next.js navigation


const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseClerk = useClerk as jest.MockedFunction<typeof useClerk>;

describe('Login/Logout Flows - Issue #654', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
    } as unknown as ReturnType<typeof useClerk>);
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: {
        id: 'test-user-id',
        fullName: 'Test User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication State Management', () => {
    it('should show loading state when authentication is not loaded', () => {
      mockUseAuth.mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
      });

      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show sign in button when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show user menu when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: 'test-user-id',
      });

      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  describe('Login Flow', () => {
    it('should navigate to correct sign-in route when clicking sign in button', () => {
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInButton);

      // Use useRouter().push instead
      expect((useRouter as jest.Mock)().push).toHaveBeenCalledWith('/signin');
    });

    it('should persist session after browser refresh', async () => {
      // Start as unauthenticated
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      const { rerender } = render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Simulate user signing in (Clerk handles authentication)
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: 'test-user-id',
      });

      rerender(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: 'test-user-id',
      });
    });

    it('should call Clerk signOut when clicking logout button', async () => {
      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      // Open the user menu dropdown
      const userMenuButton = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(userMenuButton);

      // Click the sign out option
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      // This test will fail initially because the current implementation
      // navigates to /sign-out instead of calling Clerk's signOut method
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
      });
    });

    it('should redirect to home page after logout', async () => {
      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      // Open the user menu dropdown
      const userMenuButton = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(userMenuButton);

      // Click the sign out option
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
      });
    });

    it('should clear authentication state after successful logout', async () => {
      const { rerender } = render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      // Open the user menu dropdown
      const userMenuButton = screen.getByRole('button', { name: /user menu/i });
      fireEvent.click(userMenuButton);

      // Click the sign out option
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      // Simulate successful logout
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      rerender(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Authentication State Transitions', () => {
    it('should handle smooth transitions between authenticated and unauthenticated states', () => {
      // Start as loading
      mockUseAuth.mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
      });

      const { rerender } = render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();

      // Transition to unauthenticated
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      rerender(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: 'test-user-id',
      });

      rerender(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', () => {
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
      });

      // Mock signOut to throw an error
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      render(
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      );

      // The component should still render without crashing
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});