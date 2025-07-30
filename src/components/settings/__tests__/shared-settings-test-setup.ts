import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { createSafeTestRegExp } from '../../../test-utils/secure-regexp';

/**
 * Shared Settings Test Setup
 *
 * This module consolidates common mock setups and utilities used across
 * settings component tests to eliminate code duplication.
 */

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

export const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
export const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
export const mockFetch = jest.fn();

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Sets up all standard mocks for Settings component tests
 */
export function setupSettingsTestMocks() {
  // Mock next-auth
  jest.mock('next-auth/react');

  // Mock global fetch for API calls
  global.fetch = mockFetch;

  // Mock theme components
  jest.mock('@/components/theme-toggle', () => ({
    ThemeToggle: () => 'button',
  }));

  // Mock the settings form hook with standard return values
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
}

/**
 * Standard beforeEach setup for Settings tests
 */
export function setupSettingsBeforeEach(sessionData?: any, mockUseSessionFn?: any) {
  jest.clearAllMocks();

  const defaultSession = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      subscriptionTier: 'free',
    },
    expires: '2024-12-31',
  };

  if (mockUseSessionFn) {
    mockUseSessionFn.mockReturnValue({
      data: sessionData || defaultSession,
      status: 'authenticated',
      update: jest.fn(),
    });
  }
}

// ============================================================================
// API MOCK HELPERS
// ============================================================================

/**
 * Generic API response mocker that consolidates common patterns
 */
export function mockApiResponse(
  success: boolean,
  options: {
    message?: string;
    statusCode?: number;
    responseData?: any;
    mockFetchFn?: any;
  } = {}
) {
  const {
    message = success ? 'Operation successful' : 'API Error',
    statusCode = success ? 200 : 500,
    responseData = {},
    mockFetchFn = mockFetch
  } = options;

  mockFetchFn.mockResolvedValueOnce({
    ok: success,
    status: statusCode,
    json: async () => ({
      success,
      message,
      ...responseData,
    }),
  });
}

/**
 * Mock a successful API response
 */
export const mockApiSuccess = (responseData?: any) =>
  mockApiResponse(true, { responseData });

/**
 * Mock a failed API response
 */
export const mockApiError = (message: string = 'API Error', statusCode: number = 500) =>
  mockApiResponse(false, { message, statusCode });

/**
 * Mock account deletion API response
 */
export const mockDeleteAccountResponse = (success: boolean, message: string = '', mockFetchFn?: any) =>
  mockApiResponse(success, {
    message: success ? 'Account deleted successfully' : message || 'Failed to delete account',
    mockFetchFn
  });

/**
 * Mock a network error
 */
export function mockNetworkError(errorMessage: string = 'Network error', mockFetchFn?: any) {
  const fetchMock = mockFetchFn || mockFetch;
  fetchMock.mockRejectedValueOnce(new Error(errorMessage));
}

/**
 * Mock a delayed API response for testing loading states
 */
export function mockApiDelay(delay: number = 100, mockFetchFn?: any) {
  const fetchMock = mockFetchFn || mockFetch;
  fetchMock.mockImplementation(() =>
    new Promise(resolve => setTimeout(resolve, delay))
  );
}

// ============================================================================
// COMPONENT TEST EXECUTION HELPERS
// ============================================================================

/**
 * Standard account deletion modal setup helper
 */
export function setupAccountDeletionModal(render: Function, fireEvent: Function, screen: any, selectors: any, SettingsComponent: any) {
  render(React.createElement(SettingsComponent));
  const deleteButton = selectors.deleteAccountButton();
  fireEvent.click(deleteButton);
  return deleteButton;
}

/**
 * Common account deletion test actions
 */
const deletionTestActions = {
  clickConfirmButton: (screen: any, fireEvent: Function) => {
    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmButton);
    return confirmButton;
  },

  async expectApiCall(waitFor: Function, mockFetch: Function) {
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/1/profile',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
  },

  async expectSignOut(waitFor: Function, mockSignOut: Function) {
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/',
        redirect: true,
      });
    });
  },

  async expectErrorMessage(waitFor: Function, screen: any, errorMessage: string) {
    await waitFor(() => {
      // Handle multiple possible error messages separated by |
      const errorMessages = errorMessage.split('|');
      let found = false;
      for (const msg of errorMessages) {
        try {
          expect(screen.getByText(createSafeTestRegExp(msg.trim()))).toBeInTheDocument();
          found = true;
          break;
        } catch (e) {
          // Continue to next message
        }
      }
      if (!found) {
        // If none found, fail with the original expectation to get proper error message
        expect(screen.getByText(createSafeTestRegExp(errorMessages[0].trim()))).toBeInTheDocument();
      }
    });
  }
};

/**
 * Creates standardized test execution for account deletion workflows
 */
export function createAccountDeletionTestExecutor(
  fireEvent: Function,
  screen: any,
  waitFor: Function,
  mockFetch: Function,
  mockSignOut: Function
) {
  return {
    async executeSuccessfulDeletion() {
      mockDeleteAccountResponse(true, '', mockFetch);
      deletionTestActions.clickConfirmButton(screen, fireEvent);
      await deletionTestActions.expectApiCall(waitFor, mockFetch);
      await deletionTestActions.expectSignOut(waitFor, mockSignOut);
    },

    async executeFailedDeletion(errorMessage: string = 'Failed to delete account') {
      mockDeleteAccountResponse(false, errorMessage, mockFetch);
      deletionTestActions.clickConfirmButton(screen, fireEvent);
      await deletionTestActions.expectErrorMessage(waitFor, screen, errorMessage);
      expect(mockSignOut).not.toHaveBeenCalled();
    },

    async executeNetworkError(errorMessage: string = 'Network error') {
      mockNetworkError(errorMessage, mockFetch);
      deletionTestActions.clickConfirmButton(screen, fireEvent);
      await deletionTestActions.expectErrorMessage(waitFor, screen, 'An error occurred while deleting your account|Network error');
      expect(mockSignOut).not.toHaveBeenCalled();
    },

    async testLoadingState() {
      mockApiDelay(100, mockFetch);
      const confirmButton = deletionTestActions.clickConfirmButton(screen, fireEvent);
      expect(confirmButton).toBeDisabled();
      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    }
  };
}