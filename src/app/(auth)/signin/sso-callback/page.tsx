import { SSOCallbackPage } from '@/lib/auth/sso-callback-component';

/**
 * SSO Callback Handler for Clerk Sign-in Authentication
 *
 * This page handles the callback after SSO authentication (Google, GitHub, etc.)
 * during sign-in flow and redirects existing users to the dashboard.
 *
 * Related to Issue #828: Handles SSO callbacks for existing users signing in
 */
export default function SignInSSOCallbackPage() {
  return (
    <SSOCallbackPage
      defaultRedirect="/dashboard"
      errorRedirect="/signin?error=sso_failed"
      loadingTitle="Signing You In"
      loadingMessage="Please wait while we complete your sign in..."
    />
  );
}