import { jest } from '@jest/globals';
import { useAuth } from '@clerk/nextjs';

export const mockClerk = () => {
  jest.mock('@clerk/nextjs', () => ({
    useAuth: jest.fn(),
    SignIn: jest.fn(() => <div data-testid="clerk-signin-component">Clerk SignIn Component</div>),
    SignUp: jest.fn(() => <div data-testid="clerk-signup-component">Clerk SignUp Component</div>),
  }));
};

export const mockNavigation = () => {
  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
    })),
  }));
};

export const mockUseAuth = (authState: any) => {
  (useAuth as jest.Mock).mockReturnValue(authState);
};

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Define common authentication states
export const authStates = {
  loading: { isLoaded: false, isSignedIn: false },
  notSignedIn: { isLoaded: true, isSignedIn: false },
  signedIn: { isLoaded: true, isSignedIn: true },
};

interface AuthPageTestOptions {
  component: React.ComponentType;
  expectedTestId: string;
  signInText?: string;
  signUpText?: string;
}

export const testAuthPageBehavior = ({
  component: AuthPage,
  expectedTestId,
  signInText,
  signUpText,
}: AuthPageTestOptions) => {
  const mockPush = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush }); // Reset mockPush for each test
  });

  it('should render Clerk component when user is not signed in', () => {
    mockUseAuth(authStates.notSignedIn);
    render(<AuthPage />);
    expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
    if (signInText) {
      expect(screen.getByText(signInText)).toBeInTheDocument();
    }
    if (signUpText) {
      expect(screen.getByText(signUpText)).toBeInTheDocument();
    }
  });

  it('should show loading state when auth is not loaded', () => {
    mockUseAuth(authStates.loading);
    render(<AuthPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Checking authentication status')).toBeInTheDocument();
  });

  it('should redirect to dashboard when user is already signed in', async () => {
    mockUseAuth(authStates.signedIn);
    render(<AuthPage />);
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.getByText('Taking you to dashboard')).toBeInTheDocument();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('should use consistent styling with existing auth layout', () => {
    mockUseAuth(authStates.notSignedIn);
    render(<AuthPage />);
    const container = screen.getByTestId(expectedTestId).parentElement;
    expect(container).toHaveClass('space-y-6');
  });
};

