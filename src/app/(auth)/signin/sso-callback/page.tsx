'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getSafeRedirectUrl } from '@/lib/auth/sso-redirect-handler';

/**
 * SSO Callback Handler for Clerk Sign-in Authentication
 *
 * This page handles the callback after SSO authentication (Google, GitHub, etc.)
 * during sign-in flow and redirects users to the appropriate page.
 *
 * Related to Issue #828: Handles SSO callbacks for existing users signing in
 */
function SignInSSOCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      // Still loading authentication state
      return;
    }

    if (isSignedIn) {
      // Successfully authenticated via SSO
      const redirectUrl = searchParams.get('redirect_url');
      const safeRedirectUrl = getSafeRedirectUrl({
        redirectUrl,
        defaultRedirect: '/dashboard',
      });

      router.push(safeRedirectUrl as any);
    } else {
      // Authentication failed or was cancelled
      // Redirect back to signin with error message
      router.push('/signin?error=sso_failed');
    }
  }, [isSignedIn, isLoaded, router, searchParams]);

  // Show loading state while authentication is processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Signing You In</h1>
          <p className="text-muted-foreground">
            Please wait while we complete your sign in...
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInSSOCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignInSSOCallbackContent />
    </Suspense>
  );
}