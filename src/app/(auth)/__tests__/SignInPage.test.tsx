import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import SignInPage from '../signin/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock useToast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
    dismiss: jest.fn(),
  })),
}));

describe('SignInPage Component', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
    mockToast.mockClear();

    // Default mock implementation for searchParams.get
    mockSearchParams.get.mockImplementation(param => {
      if (param === 'callbackUrl') return '/dashboard';
      if (param === 'error') return null;
      return null;
    });
  });

  it('renders the signin form correctly', () => {
    render(<SignInPage />);

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember me/i)).toBeInTheDocument();
    expect(screen.getByText(/Forgot password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
  });

  it('has correct reset password link', () => {
    render(<SignInPage />);

    const resetPasswordLink = screen.getByRole('link', { name: /Forgot password/i });
    expect(resetPasswordLink).toHaveAttribute('href', '/reset-password');
  });

  it('submits the form with valid credentials', async () => {
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'user@example.com',
        password: 'Password123!',
        callbackUrl: '/dashboard',
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows validation errors for invalid form data', async () => {
    render(<SignInPage />);

    // Submit the form without filling any fields
    await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });
  });

  it('displays authentication error from URL parameter', async () => {
    // Mock error parameter in URL
    mockSearchParams.get.mockImplementation(param => {
      if (param === 'error') return 'CredentialsSignin';
      return null;
    });

    render(<SignInPage />);

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('handles authentication errors', async () => {
    // Mock signIn to return an error
    (signIn as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
    });

    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await userEvent.type(
      screen.getByLabelText(/Password/i),
      'WrongPassword123!'
    );
    await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Redirect Message Display', () => {
    // Helper function to mock search params and test redirect messages
    const testRedirectMessage = (url: string, expectedMessage: string, _description?: string) => {
      mockSearchParams.get.mockImplementation(param => {
        if (param === 'callbackUrl') return url;
        if (param === 'next') return null;
        if (param === 'error') return null;
        return null;
      });

      render(<SignInPage />);
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    };

    // Test data for protected routes
    const redirectTestCases = [
      {
        url: 'http://localhost:3000/settings',
        expectedMessage: 'Please sign in to view your Settings',
        description: 'settings route'
      },
      {
        url: 'http://localhost:3000/parties',
        expectedMessage: 'Please sign in to view your Parties',
        description: 'parties route'
      },
      {
        url: 'http://localhost:3000/characters',
        expectedMessage: 'Please sign in to view your Characters',
        description: 'characters route'
      },
      {
        url: 'http://localhost:3000/encounters',
        expectedMessage: 'Please sign in to view your Encounters',
        description: 'encounters route'
      },
      {
        url: 'http://localhost:3000/combat',
        expectedMessage: 'Please sign in to view your Combat',
        description: 'combat route'
      },
      {
        url: 'http://localhost:3000/dashboard/profile',
        expectedMessage: 'Please sign in to view your Dashboard',
        description: 'dashboard subpath'
      }
    ];

    // Generate tests for each protected route
    redirectTestCases.forEach(({ url, expectedMessage, description }) => {
      it(`shows redirect message when callbackUrl contains ${description}`, () => {
        testRedirectMessage(url, expectedMessage);
      });
    });

    it('shows redirect message when next parameter contains a protected route', () => {
      // Mock next parameter instead of callbackUrl
      mockSearchParams.get.mockImplementation(param => {
        if (param === 'callbackUrl') return null;
        if (param === 'next') return '/settings';
        if (param === 'error') return null;
        return null;
      });

      render(<SignInPage />);

      expect(screen.getByText('Please sign in to view your Settings')).toBeInTheDocument();
    });

    it('does not show redirect message when no redirect URL is provided', () => {
      mockSearchParams.get.mockImplementation(_param => null);
      render(<SignInPage />);
      expect(screen.queryByText(/Please sign in to view your/)).not.toBeInTheDocument();
    });

    it('does not show redirect message when callbackUrl points to default dashboard', () => {
      mockSearchParams.get.mockImplementation(param => {
        if (param === 'callbackUrl') return '/dashboard';
        return null;
      });

      render(<SignInPage />);
      expect(screen.queryByText(/Please sign in to view your/)).not.toBeInTheDocument();
    });

    it('handles redirect message with subpaths correctly', () => {
      testRedirectMessage(
        'http://localhost:3000/characters/123/edit',
        'Please sign in to view your Characters'
      );
    });
  });

  describe('Toast Messages (Issue #470)', () => {
    it('shows success toast and redirects to dashboard on successful login', async () => {
      render(<SignInPage />);

      await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
      await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Success',
          variant: 'default'
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows failure toast on login failure and does not redirect', async () => {
      // Mock signIn to return an error
      (signIn as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'CredentialsSignin',
      });

      render(<SignInPage />);

      await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
      await userEvent.type(
        screen.getByLabelText(/Password/i),
        'WrongPassword123!'
      );
      await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Failure, please check your email and password',
          variant: 'destructive'
        });

        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('shows generic failure toast for non-credentials errors', async () => {
      // Mock signIn to return a different error
      (signIn as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'Configuration',
      });

      render(<SignInPage />);

      await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
      await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Failure, please check your email and password',
          variant: 'destructive'
        });

        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('shows success toast with custom callback URL redirect', async () => {
      // Mock a different callback URL
      mockSearchParams.get.mockImplementation(param => {
        if (param === 'callbackUrl') return '/characters';
        if (param === 'error') return null;
        return null;
      });

      render(<SignInPage />);

      await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
      await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Success',
          variant: 'default'
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/characters');
      });
    });
  });
});
