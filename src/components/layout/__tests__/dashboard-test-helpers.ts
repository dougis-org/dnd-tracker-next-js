/**
 * Test helpers specifically for dashboard-related components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Dashboard page test helpers
export const createDashboardPageTests = (
  Component: React.ComponentType<any>,
  useUser: jest.MockedFunction<any>
) => ({
  authenticated: {
    'renders dashboard page with layout': () => {
      useUser.mockReturnValue({
        user: {
          id: '1',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(React.createElement(Component));
      // Dashboard no longer wraps content in AppLayout - that's handled at root level
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    },

    'renders dashboard title': () => {
      useUser.mockReturnValue({
        user: {
          id: '1',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(React.createElement(Component));
      expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    },

    'renders welcome message with user name': () => {
      useUser.mockReturnValue({
        user: {
          id: '1',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(React.createElement(Component));
      expect(screen.getByText(/Welcome back, Test/i)).toBeInTheDocument();
    },

    'has proper heading structure': () => {
      useUser.mockReturnValue({
        user: {
          id: '1',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(React.createElement(Component));
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Dashboard');
    },

    'contains main content area': () => {
      useUser.mockReturnValue({
        user: {
          id: '1',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        },
        isLoaded: true,
        isSignedIn: true,
      });

      render(React.createElement(Component));
      const main = screen.getByRole('main', { hidden: true });
      expect(main).toBeInTheDocument();
    },
  },

  loading: {
    'renders loading state': () => {
      useUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      });

      render(React.createElement(Component));
      // Dashboard no longer wraps content in AppLayout - that's handled at root level
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    },
  },

  unauthenticated: {
    'renders unauthenticated message': () => {
      useUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      });

      render(React.createElement(Component));
      // Dashboard no longer wraps content in AppLayout - that's handled at root level
      expect(screen.getByText('Please sign in to view your dashboard.')).toBeInTheDocument();
    },
  },
});

// Helper to apply tests with beforeEach setup
export const applyTestSuite = (
  testSuite: Record<string, () => void>,
  beforeEachCallback?: () => void
) => {
  Object.keys(testSuite).forEach(testName => {
    test(testName, () => {
      beforeEachCallback?.();
      testSuite[testName]();
    });
  });
};