import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import ClerkSignUpPage from '../signup/page';

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  SignUp: jest.fn(() => <div data-testid="clerk-signup-component">Clerk SignUp Component</div>),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('Clerk SignUp Page', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Clerk SignUp component when user is not signed in', () => {
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

    render(<ClerkSignUpPage />);

    expect(screen.getByTestId('clerk-signup-component')).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Register to start building your D&D encounters')).toBeInTheDocument();
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

    render(<ClerkSignUpPage />);

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

    render(<ClerkSignUpPage />);

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

    render(<ClerkSignUpPage />);

    // Check that the page maintains consistent structure
    const container = screen.getByTestId('clerk-signup-component').parentElement;
    expect(container).toHaveClass('space-y-6'); // Consistent with existing layout
  });

  it('should configure Clerk SignUp component with correct appearance', () => {
    const { SignUp } = require('@clerk/nextjs');

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

    render(<ClerkSignUpPage />);

    // Verify that SignUp component was called with appearance configuration
    expect(SignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: expect.objectContaining({
          elements: expect.any(Object),
        }),
        redirectUrl: '/profile-setup',
      }),
      expect.any(Object)
    );
  });
});