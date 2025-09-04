'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getSafeRedirectUrl } from '@/lib/auth/sso-redirect-handler';

interface SSOCallbackProps {
  defaultRedirect: string;
  errorRedirect: string;
  loadingTitle: string;
  loadingMessage: string;
}

function SSOCallbackContent({
  defaultRedirect,
  errorRedirect,
  loadingTitle,
  loadingMessage,
}: SSOCallbackProps) {
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
        defaultRedirect,
      });

      router.push(safeRedirectUrl as any);
    } else {
      // Authentication failed or was cancelled
      router.push(errorRedirect);
    }
  }, [isSignedIn, isLoaded, router, searchParams, defaultRedirect, errorRedirect]);

  // Show loading state while authentication is processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{loadingTitle}</h1>
          <p className="text-muted-foreground">{loadingMessage}</p>
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
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

export function SSOCallbackPage(props: SSOCallbackProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SSOCallbackContent {...props} />
    </Suspense>
  );
}