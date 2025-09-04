import { jest } from '@jest/globals';

const mockGetSafeRedirectUrl = jest.fn();

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

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import SignUpSSOCallbackPage from '../page';

describe('SSO Callback Page (Signup)', () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    // Setup default mock for getSafeRedirectUrl
    mockGetSafeRedirectUrl.mockImplementation(({ redirectUrl, defaultRedirect }) => {
      return redirectUrl || defaultRedirect;
    });
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
});