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
import { useRouter, useSearchParams } from 'next/navigation';

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

// SSO Callback Test Utilities
export const mockGetSafeRedirectUrl = jest.fn();

export const setupSSOCallbackMocks = () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };

  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
  }));

  jest.mock('@clerk/nextjs', () => ({
    useAuth: jest.fn(),
  }));

  jest.mock('@/lib/auth/sso-redirect-handler', () => ({
    getSafeRedirectUrl: mockGetSafeRedirectUrl,
  }));

  return { mockPush, mockSearchParams };
};

export const setupSSOCallbackMocksInTest = () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    // Reset and setup default mock for getSafeRedirectUrl
    mockGetSafeRedirectUrl.mockReset();
    mockGetSafeRedirectUrl.mockImplementation(({ redirectUrl, defaultRedirect }) => {
      return redirectUrl || defaultRedirect;
    });
  });

  afterAll(() => {
    // Restore original location
    window.location = originalLocation;
  });

  return { mockPush, mockSearchParams, originalLocation };
};

interface SSOCallbackTestConfig {
  component: React.ComponentType;
  defaultRedirect: string;
  errorRedirect: string;
  loadingTitle: string;
  loadingMessage: string;
  pageName: string;
}

export const testSSOCallbackBehavior = ({
  component: SSOCallbackPage,
  defaultRedirect,
  errorRedirect,
  loadingTitle,
  loadingMessage,
  pageName: _pageName
}: SSOCallbackTestConfig) => {
  const { mockPush, mockSearchParams } = setupSSOCallbackMocksInTest();

  describe('Loading State', () => {
    it('should show loading spinner when auth is not loaded', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isLoaded: false,
      });
      mockSearchParams.get.mockReturnValue(null);

      render(<SSOCallbackPage />);

      expect(screen.getByText(loadingTitle)).toBeInTheDocument();
      expect(screen.getByText(loadingMessage)).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Successful Authentication', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isLoaded: true,
      });
    });

    it(`should redirect to ${defaultRedirect} when no redirect_url is provided`, async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<SSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(defaultRedirect);
      });
    });

    it('should redirect to provided redirect_url when valid same-origin URL', async () => {
      const redirectUrl = 'https://example.com/dashboard';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return the same-origin URL
      mockGetSafeRedirectUrl.mockReturnValueOnce(redirectUrl);

      render(<SSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect,
        });
        expect(mockPush).toHaveBeenCalledWith(redirectUrl);
      });
    });

    it(`should redirect to ${defaultRedirect} when redirect_url is different origin`, async () => {
      const redirectUrl = 'https://malicious-site.com/steal-data';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for cross-origin
      mockGetSafeRedirectUrl.mockReturnValueOnce(defaultRedirect);

      render(<SSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect,
        });
        expect(mockPush).toHaveBeenCalledWith(defaultRedirect);
      });
    });

    it(`should redirect to ${defaultRedirect} when redirect_url is malformed`, async () => {
      const redirectUrl = 'not-a-valid-url';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for malformed URL
      mockGetSafeRedirectUrl.mockReturnValueOnce(defaultRedirect);

      render(<SSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect,
        });
        expect(mockPush).toHaveBeenCalledWith(defaultRedirect);
      });
    });
  });

  describe('Failed Authentication', () => {
    it(`should redirect to ${errorRedirect} when authentication failed`, async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isLoaded: true,
      });
      mockSearchParams.get.mockReturnValue(null);

      render(<SSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(errorRedirect);
      });
    });
  });
};

