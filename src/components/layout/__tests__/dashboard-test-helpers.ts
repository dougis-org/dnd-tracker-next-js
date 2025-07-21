/**
 * Test helpers specifically for dashboard-related components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Dashboard page test helpers
export const createDashboardPageTests = (
  Component: React.ComponentType<any>,
  useSession: jest.MockedFunction<any>
) => ({
  authenticated: {
    'renders dashboard page with layout': () => {
      useSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'free',
          },
          expires: '2024-01-01',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      // Dashboard no longer wraps content in AppLayout - that's handled at root level
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    },

    'renders dashboard title': () => {
      useSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'free',
          },
          expires: '2024-01-01',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    },

    'renders welcome message with user name': () => {
      useSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'free',
          },
          expires: '2024-01-01',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    },

    'has proper heading structure': () => {
      useSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'free',
          },
          expires: '2024-01-01',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Dashboard');
    },

    'contains main content area': () => {
      useSession.mockReturnValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'free',
          },
          expires: '2024-01-01',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      const main = screen.getByRole('main', { hidden: true });
      expect(main).toBeInTheDocument();
    },
  },

  loading: {
    'renders loading state': () => {
      useSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(React.createElement(Component));
      // Dashboard no longer wraps content in AppLayout - that's handled at root level
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    },
  },

  unauthenticated: {
    'renders unauthenticated message': () => {
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
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