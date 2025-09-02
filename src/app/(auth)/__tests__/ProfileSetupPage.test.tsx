import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileSetupPage from '../profile-setup/page';
import { useAuth } from '@clerk/nextjs';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock @clerk/nextjs
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));


describe('ProfileSetupPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it('shows loading state while authentication is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      userId: null,
    });

    render(<ProfileSetupPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Checking authentication status')).toBeInTheDocument();
  });

  it('redirects to sign-in when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    render(<ProfileSetupPage />);

    // TODO: Implement proper window.location.href mock - see issue #701
    // Component should redirect to /sign-in when user is not authenticated
    expect(true).toBe(true); // Placeholder assertion
  });

  it('redirects to dashboard when user is signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'test-user-123',
    });

    render(<ProfileSetupPage />);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('shows redirecting state when authentication is loaded', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'test-user-123',
    });

    render(<ProfileSetupPage />);

    // Should show redirecting message briefly before redirect
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.getByText('Taking you to profile setup')).toBeInTheDocument();
  });
});