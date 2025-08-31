'use client';

import React from 'react';
import '@testing-library/jest-dom';
import {
  mockUseSession,
  createSessionMock,
  loadingSessionMock,
  unauthenticatedSessionMock,
  sessionWithoutUserMock,
  nullSessionMock,
  userWithEmailOnlyMock,
  userWithNameAndEmailMock,
  renderSettingsPage,
  expectLoadingState,
  expectUnauthenticatedState,
  expectAuthenticatedState,
  expectSettingsComponent,
  expectPageStructure,
  expectAccessibilityStructure,
} from './page-test-helpers';

// Mock Clerk
jest.mock('@clerk/nextjs');

// Mock AppLayout
jest.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

// Mock Settings component
jest.mock('@/components/settings', () => ({
  Settings: () => <div data-testid="settings-component">Settings Component</div>,
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue(loadingSessionMock);

      renderSettingsPage();

      expectLoadingState();
    });

    it('should show unauthenticated message when user is not signed in', () => {
      mockUseSession.mockReturnValue(unauthenticatedSessionMock);

      renderSettingsPage();

      expectUnauthenticatedState();
    });

    it('should render settings component when user is authenticated', () => {
      mockUseSession.mockReturnValue(createSessionMock());

      renderSettingsPage();

      expectAuthenticatedState();
    });
  });

  describe('Page Structure', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(createSessionMock());
    });

    it('should have complete page structure', () => {
      renderSettingsPage();

      expectPageStructure();
    });
  });

  describe('User Context', () => {
    const testUserVariant = (mockSession: any, testName: string) => {
      it(`should handle ${testName}`, () => {
        mockUseSession.mockReturnValue(mockSession);
        renderSettingsPage();
        expectSettingsComponent();
      });
    };

    testUserVariant(userWithEmailOnlyMock, 'user with only email');
    testUserVariant(userWithNameAndEmailMock, 'user with name and email');
  });

  describe('Error Handling', () => {
    const testErrorCase = (mockSession: any, testName: string) => {
      it(`should handle ${testName}`, () => {
        mockUseSession.mockReturnValue(mockSession);
        renderSettingsPage();
        expectUnauthenticatedState();
      });
    };

    testErrorCase(sessionWithoutUserMock, 'session data without user object');
    testErrorCase(nullSessionMock, 'null session data with authenticated status');
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(createSessionMock());
    });

    it('should have proper semantic structure', () => {
      renderSettingsPage();

      expectAccessibilityStructure();
    });

    it('should have accessible loading state', () => {
      mockUseSession.mockReturnValue(loadingSessionMock);

      renderSettingsPage();

      expectLoadingState();
    });
  });
});