'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

/**
 * Profile Setup Redirect Page
 * Redirects to Clerk's user profile management
 */
export default function ProfileSetupPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // Redirect to dashboard since profile setup is handled by Clerk
        router.push('/dashboard');
      } else {
        // Not signed in, redirect to Clerk's sign-in
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
        <p className="text-muted-foreground">Taking you to profile setup</p>
      </div>
    </div>
  );
}