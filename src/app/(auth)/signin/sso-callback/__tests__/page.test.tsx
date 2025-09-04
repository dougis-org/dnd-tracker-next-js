import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import SignInSSOCallbackPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

describe('SSO Callback Page (Sign In)', () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  afterAll(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is not loaded', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isLoaded: false,
      });
      mockSearchParams.get.mockReturnValue(null);

      render(<SignInSSOCallbackPage />);

      expect(screen.getByText('Signing You In')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we complete your sign in...')).toBeInTheDocument();
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

    it('should redirect to dashboard when no redirect_url is provided', async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect to provided redirect_url when valid same-origin URL', async () => {
      const redirectUrl = 'https://example.com/dashboard';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock window.location.origin
      delete (window as any).location;
      window.location = { origin: 'https://example.com' } as Location;

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(redirectUrl);
      });
    });

    it('should redirect to dashboard when redirect_url is different origin', async () => {
      const redirectUrl = 'https://malicious-site.com/steal-data';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock window.location.origin
      delete (window as any).location;
      window.location = { origin: 'https://example.com' } as Location;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(consoleSpy).not.toHaveBeenCalled(); // Cross-origin doesn't log warning, just falls through
      });

      consoleSpy.mockRestore();
    });

    it('should redirect to dashboard when redirect_url is malformed', async () => {
      const redirectUrl = 'not-a-valid-url';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid redirect URL:',
          redirectUrl,
          expect.any(TypeError)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Failed Authentication', () => {
    it('should redirect to signin with error when authentication failed', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isLoaded: true,
      });
      mockSearchParams.get.mockReturnValue(null);

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/signin?error=sso_failed');
      });
    });
  });
});