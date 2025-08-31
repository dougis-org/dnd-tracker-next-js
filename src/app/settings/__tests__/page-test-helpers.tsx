import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import SettingsPage from '../page';

export const mockUseSession = useAuth as jest.MockedFunction<typeof useAuth>;

export const createSessionMock = (overrides: any = {}) => ({
  userId: '1',
  isSignedIn: true,
  isLoaded: true,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionId: 'session_123',
  ...overrides,
});

export const loadingSessionMock = {
  userId: null,
  isSignedIn: false,
  isLoaded: false,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionId: null,
};

export const unauthenticatedSessionMock = {
  userId: null,
  isSignedIn: false,
  isLoaded: true,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionId: null,
};

export const sessionWithoutUserMock = {
  userId: null,
  isSignedIn: false,
  isLoaded: true,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionId: null,
};

export const nullSessionMock = {
  userId: null,
  isSignedIn: false,
  isLoaded: true,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionId: null,
};

export const userWithEmailOnlyMock = createSessionMock({
  userId: '1',
  isSignedIn: true,
  isLoaded: true,
});

export const userWithNameAndEmailMock = createSessionMock({
  userId: '1',
  isSignedIn: true,
  isLoaded: true,
});

// Render helpers
export const renderSettingsPage = () => {
  return render(<SettingsPage />);
};

// Expectation helpers
export const expectSettingsComponent = () => {
  expect(screen.getByTestId('settings-component')).toBeInTheDocument();
};

export const expectNoSettingsComponent = () => {
  expect(screen.queryByTestId('settings-component')).not.toBeInTheDocument();
};

export const expectLoadingState = () => {
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expectNoSettingsComponent();
};

export const expectUnauthenticatedState = () => {
  expect(screen.getByText('Please sign in to access your settings.')).toBeInTheDocument();
  expectNoSettingsComponent();
};

export const expectAuthenticatedState = () => {
  expectSettingsComponent();
  expect(screen.getByText('Settings')).toBeInTheDocument();
  expect(screen.getByText('Manage your account settings and preferences')).toBeInTheDocument();
};

export const expectAppLayout = () => {
  // Settings page no longer wraps content in AppLayout - that's handled at root level
  // Just verify the main content structure is present
  const mainContainer = screen.getByRole('main');
  expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
};

export const expectPageStructure = () => {
  expectAppLayout();
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading).toHaveTextContent('Settings');

  const mainContainer = screen.getByRole('main');
  expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
};

export const expectAccessibilityStructure = () => {
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
};