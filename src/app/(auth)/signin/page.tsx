'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignIn } from '@clerk/nextjs';

/**
 * Clerk Sign-in Page
 * Renders Clerk's SignIn component for unauthenticated users
 * Redirects authenticated users to dashboard
 */
export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Already signed in, redirect to dashboard
      router.push('/');
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

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Redirecting...</h1>
          <p className="text-muted-foreground">Taking you to dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-muted-foreground">
          Access your D&D Encounter Tracker
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'border-0 shadow-none bg-transparent',
          },
        }}
        redirectUrl="/dashboard"
      />
    </div>
  );
}