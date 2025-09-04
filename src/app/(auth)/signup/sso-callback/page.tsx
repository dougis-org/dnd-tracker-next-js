import { SSOCallbackPage } from '@/lib/auth/sso-callback-component';

/**
 * SSO Callback Handler for Clerk Authentication - Sign Up Flow
 *
 * This page handles the callback after SSO authentication (Google, GitHub, etc.)
 * during the sign-up process and redirects new users to profile setup.
 *
 * Issue #828: Registering lands on a 404 page
 * - Handles SSO callback from Clerk after external authentication
 * - Redirects to profile-setup for new users or handles redirect_url
 * - Provides loading states during authentication process
 */
export default function SignUpSSOCallbackPage() {
  return (
    <SSOCallbackPage
      defaultRedirect="/profile-setup"
      errorRedirect="/signup?error=sso_failed"
      loadingTitle="Completing Sign Up"
      loadingMessage="Please wait while we finish setting up your account..."
    />
  );
}