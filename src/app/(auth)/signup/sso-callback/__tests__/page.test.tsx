import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import SignUpSSOCallbackPage from '../page';
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

describe('SSO Callback Page (Signup)', () => {
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

      render(<SignUpSSOCallbackPage />);

      expect(screen.getByText('Completing Sign Up')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we finish setting up your account...')).toBeInTheDocument();
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

    it('should redirect to profile-setup when no redirect_url is provided', async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile-setup');
      });
    });
  });

  describe('Failed Authentication', () => {
    it('should redirect to signup with error when authentication failed', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: false,
        isLoaded: true,
      });
      mockSearchParams.get.mockReturnValue(null);

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/signup?error=sso_failed');
      });
    });
  });

  describe('Successful Authentication', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        isSignedIn: true,
        isLoaded: true,
      });
    });

    it('should redirect to provided redirect_url when valid same-origin URL', async () => {
      const redirectUrl = 'https://example.com/dashboard';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return the same-origin URL
      mockGetSafeRedirectUrl.mockReturnValue(redirectUrl);

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(redirectUrl);
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
      });
    });

    it('should redirect to profile-setup when redirect_url is different origin', async () => {
      const redirectUrl = 'https://malicious-site.com/steal-data';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for cross-origin
      mockGetSafeRedirectUrl.mockReturnValue('/profile-setup');

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile-setup');
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
      });
    });

    it('should redirect to profile-setup when redirect_url is malformed', async () => {
      const redirectUrl = 'not-a-valid-url';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for malformed URL
      mockGetSafeRedirectUrl.mockReturnValue('/profile-setup');

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile-setup');
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
      });
    });
  });
});