'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

/**
 * Clerk Sign-in Redirect Page
 * Redirects unauthenticated users to Clerk's sign-in flow
 * Authenticated users are redirected to dashboard
 */
export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // Already signed in, redirect to home
        router.push('/');
      } else {
        // Not signed in, redirect to Clerk's sign-in using window location
        window.location.href = '/sign-in';
        return;
      }
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Redirecting...</h1>
        <p className="text-muted-foreground">
          {isSignedIn ? 'Taking you to dashboard' : 'Redirecting to sign in'}
        </p>
      </div>
    </div>
  );
}