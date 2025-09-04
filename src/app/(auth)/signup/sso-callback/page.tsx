'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getSafeRedirectUrl } from '@/lib/auth/sso-redirect-handler';

/**
 * SSO Callback Handler for Clerk Authentication
 *
 * This page handles the callback after SSO authentication (Google, GitHub, etc.)
 * and redirects users to the appropriate page after successful authentication.
 *
 * Issue #828: Registering lands on a 404 page
 * - Handles SSO callback from Clerk after external authentication
 * - Redirects to profile-setup or dashboard based on user status
 * - Provides loading states during authentication process
 */
function SSOCallbackContent() {
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
        defaultRedirect: '/profile-setup',
      });

      router.push(safeRedirectUrl as any);
    } else {
      // Authentication failed or was cancelled
      // Redirect back to signup with error message
      router.push('/signup?error=sso_failed');
    }
  }, [isSignedIn, isLoaded, router, searchParams]);

  // Show loading state while authentication is processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Completing Sign Up</h1>
          <p className="text-muted-foreground">
            Please wait while we finish setting up your account...
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

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SSOCallbackContent />
    </Suspense>
  );
}