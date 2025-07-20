import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import ProfileSetupPage from '../profile-setup/page';
import {
  setupMocksForTest,
  createFailedFetchMock,
  fillProfileFormField,
  clickCompleteSetupButton,
  expectProfileApiCall,
} from './test-helpers';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch function
global.fetch = jest.fn();

describe('ProfileSetupPage Component', () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = setupMocksForTest();
    mockRouter = mocks.mockRouter;
  });

  it('renders the profile setup form correctly', () => {
    render(<ProfileSetupPage />);

    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Timezone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred D&D Edition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Experience Level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Role/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Complete Setup/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Skip for Now/i })
    ).toBeInTheDocument();
  });

  it('redirects to signin if user is not authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<ProfileSetupPage />);

    expect(mockRouter.push).toHaveBeenCalledWith('/signin');
  });

  it('shows loading state while session is loading', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(<ProfileSetupPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('submits the profile setup form with valid data', async () => {
    // Mock session without a name to avoid the clear issue
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          name: null, // No name to avoid prefilled value
        },
      },
      status: 'authenticated',
    });

    render(<ProfileSetupPage />);

    await fillProfileFormField(/Display Name/i, 'John the Dungeon Master');
    await fillProfileFormField(/Preferred D&D Edition/i, 'Pathfinder 2e');
    await clickCompleteSetupButton();

    await waitFor(() => {
      expectProfileApiCall('123');

      const actualCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const parsedBody = JSON.parse(actualCall.body);

      expect(parsedBody).toMatchObject({
        displayName: 'John the Dungeon Master',
        dndEdition: 'Pathfinder 2e',
      });
    });
  });

  it('shows success screen after successful profile setup', async () => {
    render(<ProfileSetupPage />);

    await fillProfileFormField(/Display Name/i, 'Test User');
    await clickCompleteSetupButton();

    await waitFor(() => {
      expect(screen.getByText('Profile Setup Complete!')).toBeInTheDocument();
      expect(
        screen.getByText(/Welcome to D&D Encounter Tracker/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue to Dashboard/i })
      ).toBeInTheDocument();
    });
  });

  it('handles skip functionality correctly', async () => {
    render(<ProfileSetupPage />);

    await userEvent.click(
      screen.getByRole('button', { name: /Skip for Now/i })
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('allows submitting empty form (all fields are optional)', async () => {
    render(<ProfileSetupPage />);

    await clickCompleteSetupButton();

    await waitFor(() => {
      // Should show success screen since all profile fields are optional
      expect(screen.getByText('Profile Setup Complete!')).toBeInTheDocument();
    });
  });

  it('handles server errors gracefully', async () => {
    createFailedFetchMock(400, [{ field: 'displayName', message: 'Display name is required' }]);

    render(<ProfileSetupPage />);

    await fillProfileFormField(/Display Name/i, 'Test');
    await clickCompleteSetupButton();

    await waitFor(() => {
      expectProfileApiCall('123');
      expect(mockRouter.push).not.toHaveBeenCalledWith('/dashboard');
      expect(screen.getByRole('button', { name: /Complete Setup/i })).toBeEnabled();
    });
  });

  it('navigates to dashboard from success screen', async () => {
    render(<ProfileSetupPage />);

    // Complete the form first
    await fillProfileFormField(/Display Name/i, 'Test User');
    await clickCompleteSetupButton();

    // Wait for success screen
    await waitFor(() => {
      expect(screen.getByText('Profile Setup Complete!')).toBeInTheDocument();
    });

    // Click continue button
    const continueButton = screen.getByRole('button', {
      name: /Continue to Dashboard/i,
    });
    await userEvent.click(continueButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error when user session has no ID', async () => {
    // Mock session without user ID
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          name: 'John Doe',
          // No ID property
        },
      },
      status: 'authenticated',
    });

    render(<ProfileSetupPage />);

    await fillProfileFormField(/Display Name/i, 'Test User');
    await clickCompleteSetupButton();

    await waitFor(() => {
      expect(screen.getByText('User session not found')).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Complete Setup/i })).toBeEnabled();
    });
  });
});