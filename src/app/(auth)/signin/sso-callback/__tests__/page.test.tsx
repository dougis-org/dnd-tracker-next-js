import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import SignInSSOCallbackPage from '../page';
import { getSafeRedirectUrl } from '@/lib/auth/sso-redirect-handler';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

const mockGetSafeRedirectUrl = jest.fn();
jest.mock('@/lib/auth/sso-redirect-handler', () => ({
  getSafeRedirectUrl: mockGetSafeRedirectUrl,
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
    
    // Setup default mock for getSafeRedirectUrl
    mockGetSafeRedirectUrl.mockImplementation(({ redirectUrl, defaultRedirect }) => {
      return redirectUrl || defaultRedirect;
    });
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

      // Mock getSafeRedirectUrl to return the same-origin URL
      mockGetSafeRedirectUrl.mockReturnValue(redirectUrl);

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(redirectUrl);
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/dashboard',
        });
      });
    });

    it('should redirect to dashboard when redirect_url is different origin', async () => {
      const redirectUrl = 'https://malicious-site.com/steal-data';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for cross-origin
      mockGetSafeRedirectUrl.mockReturnValue('/dashboard');

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/dashboard',
        });
      });
    });

    it('should redirect to dashboard when redirect_url is malformed', async () => {
      const redirectUrl = 'not-a-valid-url';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for malformed URL
      mockGetSafeRedirectUrl.mockReturnValue('/dashboard');

      render(<SignInSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/dashboard',
        });
      });
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