'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Settings } from '../Settings';
import { getSettingsSelectors } from './test-helpers';
import '@testing-library/jest-dom';

// Mock Clerk
const mockSignOut = jest.fn();
const mockUseUser = jest.fn();
const mockUseClerk = jest.fn();

jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  useClerk: jest.fn(),
}));

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

jest.mock('../hooks/useSettingsForm', () => ({
  useSettingsForm: () => ({
    profileData: { name: 'Test User', email: 'test@example.com' },
    setProfileData: jest.fn(),
    notifications: { email: true, combat: true, encounters: true },
    handleNotificationChange: jest.fn(),
    formErrors: {},
    message: null,
    isLoadingProfile: false,
    isLoadingNotifications: false,
    handleProfileSubmit: jest.fn(),
    handleNotificationsSubmit: jest.fn(),
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Settings Component - Account Deletion', () => {
  const selectors = getSettingsSelectors();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup authenticated user
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
    });

    // Apply mocks
    require('@clerk/nextjs').useUser.mockImplementation(mockUseUser);
    require('@clerk/nextjs').useClerk.mockImplementation(mockUseClerk);
  });

  describe('Delete Account Button', () => {
    it('should render delete account button', () => {
      render(<Settings />);

      const deleteButton = selectors.deleteAccountButton();
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('bg-destructive');
    });

    it('should open delete confirmation modal when delete button is clicked', () => {
      render(<Settings />);

      const deleteButton = selectors.deleteAccountButton();
      fireEvent.click(deleteButton);

      expect(
        screen.getByRole('button', { name: /confirm delete/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText('This action cannot be undone')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/All your data will be permanently removed/)
      ).toBeInTheDocument();
    });
  });

  describe('Delete Confirmation Modal', () => {
    beforeEach(() => {
      render(<Settings />);
      const deleteButton = selectors.deleteAccountButton();
      fireEvent.click(deleteButton);
    });

    it('should display warning message in modal', () => {
      expect(
        screen.getByText(/Are you sure you want to delete your account/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/All your data will be permanently removed/)
      ).toBeInTheDocument();
    });

    it('should have confirm and cancel buttons', () => {
      expect(
        screen.getByRole('button', { name: /confirm delete/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', () => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(
        screen.queryByRole('button', { name: /confirm delete/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Account Deletion Process', () => {
    beforeEach(() => {
      render(<Settings />);
      const deleteButton = selectors.deleteAccountButton();
      fireEvent.click(deleteButton);
    });

    it('should call delete API when confirm is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Account deleted successfully',
          }),
      });

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/test-user-123/profile',
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      });
    });

    it('should sign out user after successful deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Account deleted successfully',
          }),
      });

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
      });
    });

    it('should close modal after successful deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Account deleted successfully',
          }),
      });

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /confirm delete/i })
        ).not.toBeInTheDocument();
      });
    });

    it('should show error message when deletion fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            message: 'Failed to delete account',
          }),
      });

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to delete account')
        ).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      render(<Settings />);
      const deleteButton = selectors.deleteAccountButton();
      fireEvent.click(deleteButton);
    });

    it('should disable confirm button during deletion', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });

    it('should show loading text during deletion', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      });
    });
  });
});
