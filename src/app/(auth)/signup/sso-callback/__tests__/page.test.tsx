import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import SignUpSSOCallbackPage from '../page';
import { testBasicSSOCallbackBehavior } from '@/app/(auth)/__tests__/auth-test-utils';

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

describe('SSO Callback Page (Sign Up)', () => {
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

  testBasicSSOCallbackBehavior({
    component: SignUpSSOCallbackPage,
    defaultRedirect: '/profile-setup',
    errorRedirect: '/signup?error=sso_failed',
    loadingTitle: 'Completing Sign Up',
    loadingMessage: 'Please wait while we finish setting up your account...'
  });

  describe('Redirect URL Validation', () => {
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
      mockGetSafeRedirectUrl.mockReturnValueOnce(redirectUrl);

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
        expect(mockPush).toHaveBeenCalledWith(redirectUrl);
      });
    });

    it('should redirect to /profile-setup when redirect_url is different origin', async () => {
      const redirectUrl = 'https://malicious-site.com/steal-data';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for cross-origin
      mockGetSafeRedirectUrl.mockReturnValueOnce('/profile-setup');

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
        expect(mockPush).toHaveBeenCalledWith('/profile-setup');
      });
    });

    it('should redirect to /profile-setup when redirect_url is malformed', async () => {
      const redirectUrl = 'not-a-valid-url';
      mockSearchParams.get.mockReturnValue(redirectUrl);

      // Mock getSafeRedirectUrl to return default for malformed URL
      mockGetSafeRedirectUrl.mockReturnValueOnce('/profile-setup');

      render(<SignUpSSOCallbackPage />);

      await waitFor(() => {
        expect(mockGetSafeRedirectUrl).toHaveBeenCalledWith({
          redirectUrl,
          defaultRedirect: '/profile-setup',
        });
        expect(mockPush).toHaveBeenCalledWith('/profile-setup');
      });
    });
  });
});