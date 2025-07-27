'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    default: 'An error occurred during authentication.',
    configuration: 'There is a problem with the server configuration.',
    accessdenied: 'You do not have permission to sign in.',
    verification: 'The verification token is invalid or has expired.',
    'signin-callback': 'There was an error signing in with your provider.',
    'callback-credentials': 'There was an error with your sign-in credentials.',
    sessionrequired: 'You need to be signed in to access this page.',
    accountnotlinked:
      'To confirm your identity, sign in with the same account you used originally.',
    CredentialsSignin: 'The email or password you entered is incorrect.',
  };

  const errorMessage = error
    ? errorMessages[error] || errorMessages.default
    : errorMessages.default;

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="text-slate-500 dark:text-slate-400">{errorMessage}</p>
      </div>

      <div className="space-y-4">
        <Button asChild>
          <Link href={'/signin' as any}>Try Again</Link>
        </Button>
        <div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
