'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignUp } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Clerk Sign-up Page
 * Renders Clerk's SignUp component for unauthenticated users
 * Redirects authenticated users to dashboard
 */
export default function SignUpPage() {
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
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Register to start building your D&D encounters
        </p>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'border-0 shadow-none bg-transparent',
          },
        }}
        redirectUrl="/profile-setup"
      />

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/signin"
          className="text-primary hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
