import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import ClerkSignInPage from '../signin/page';

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  SignIn: jest.fn(() => <div data-testid="clerk-signin-component">Clerk SignIn Component</div>),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('Clerk SignIn Page', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Clerk SignIn component when user is not signed in', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
      user: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      organization: null,
      getToken: jest.fn(),
      has: jest.fn(),
      signOut: jest.fn(),
    });

    render(<ClerkSignInPage />);

    expect(screen.getByTestId('clerk-signin-component')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('should show loading state when auth is not loaded', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: false,
      userId: null,
      user: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      organization: null,
      getToken: jest.fn(),
      has: jest.fn(),
      signOut: jest.fn(),
    });

    render(<ClerkSignInPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Checking authentication status')).toBeInTheDocument();
  });

  it('should redirect to dashboard when user is already signed in', () => {
    const mockRouter = { push: jest.fn() };
    jest.doMock('next/navigation', () => ({
      useRouter: jest.fn(() => mockRouter),
    }));

    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: 'user123',
      user: {} as any,
      sessionId: 'session123',
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      organization: null,
      getToken: jest.fn(),
      has: jest.fn(),
      signOut: jest.fn(),
    });

    render(<ClerkSignInPage />);

    // Should show redirecting message
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.getByText('Taking you to dashboard')).toBeInTheDocument();
  });

  it('should use consistent styling with existing auth layout', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
      user: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      organization: null,
      getToken: jest.fn(),
      has: jest.fn(),
      signOut: jest.fn(),
    });

    render(<ClerkSignInPage />);

    // Check that the page maintains consistent structure
    const container = screen.getByTestId('clerk-signin-component').parentElement;
    expect(container).toHaveClass('space-y-6'); // Consistent with existing layout
  });
});