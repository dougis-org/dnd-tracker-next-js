import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import SettingsPage from '../page';

export const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

export const createSessionMock = (overrides: any = {}) => ({
  data: {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      ...overrides.user,
    },
    expires: '2024-12-31',
    ...overrides.data,
  },
  status: 'authenticated' as const,
  update: jest.fn(),
  ...overrides,
});

export const loadingSessionMock = {
  data: null,
  status: 'loading' as const,
  update: jest.fn(),
};

export const unauthenticatedSessionMock = {
  data: null,
  status: 'unauthenticated' as const,
  update: jest.fn(),
};

export const sessionWithoutUserMock = {
  data: {
    expires: '2024-12-31',
  } as any,
  status: 'authenticated' as const,
  update: jest.fn(),
};

export const nullSessionMock = {
  data: null,
  status: 'authenticated' as const,
  update: jest.fn(),
};

export const userWithEmailOnlyMock = createSessionMock({
  user: {
    id: '1',
    email: 'test@example.com',
    name: undefined,
  },
});

export const userWithNameAndEmailMock = createSessionMock({
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
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