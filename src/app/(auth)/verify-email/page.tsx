'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type VerificationState = 'pending' | 'success' | 'error' | 'sending' | 'sent';

function VerifyEmailContent() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>(
    token ? 'pending' : 'sent'
  );
  const [error, setError] = useState('');

  // Handle token verification
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  // Verify the token with the API
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState('error');
        setError(data.message || 'Token verification failed');
        return;
      }

      setState('success');
    } catch {
      setState('error');
      setError('An unexpected error occurred');
    }
  };

  // Resend verification email
  const resendVerification = async () => {
    if (!email) {
      setError('Email address is missing');
      return;
    }

    setState('sending');
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState('error');
        setError(data.message || 'Failed to resend verification email');
        return;
      }

      setState('sent');
    } catch {
      setState('error');
      setError('An unexpected error occurred');
    }
  };

  // Component for pending verification state
  const PendingVerification = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Verifying your email</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Please wait while we verify your email address...
      </p>
    </div>
  );

  // Component for successful verification
  const SuccessfulVerification = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-600 dark:text-green-300" />
        </div>
      </div>
      <h1 className="text-2xl font-bold">Email Verified!</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Thank you for verifying your email address. Your account is now active.
      </p>
      <div className="pt-2">
        <Button asChild>
          <Link href={'/signin?next=/profile-setup' as any}>Sign In and Complete Profile</Link>
        </Button>
      </div>
    </div>
  );

  // Component for verification error
  const VerificationError = () => (
    <div className="text-center space-y-4">
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error || 'Failed to verify email'}</AlertDescription>
      </Alert>
      <h1 className="text-2xl font-bold">Verification Failed</h1>
      <p className="text-slate-500 dark:text-slate-400">
        The verification link may have expired or is invalid.
      </p>
      <div className="pt-2 space-y-3">
        {email && (
          <Button onClick={resendVerification} disabled={state === 'sending'}>
            {state === 'sending' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        )}
        <div>
          <Link
            href={'/signin' as any}
            className="text-sm text-primary hover:underline"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );

  // Component for sending verification email
  const SendingVerification = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Sending Verification Email</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Please wait while we send a new verification email...
      </p>
    </div>
  );

  // Component for verification sent
  const VerificationSent = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold">Check Your Email</h1>
      <p className="text-slate-500 dark:text-slate-400">
        We&apos;ve sent a verification link to:
      </p>
      {email && <p className="font-medium">{email}</p>}
      <p className="text-slate-500 dark:text-slate-400">
        Click the link in the email to verify your account.
      </p>
      <div className="pt-2 space-y-3">
        <Button onClick={resendVerification} disabled={state === 'sending'}>
          {state === 'sending' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </Button>
        <div>
          <Link
            href={'/signin' as any}
            className="text-sm text-primary hover:underline"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );

  // Render content based on current state
  const renderContent = () => {
    switch (state) {
      case 'pending':
        return <PendingVerification />;
      case 'success':
        return <SuccessfulVerification />;
      case 'error':
        return <VerificationError />;
      case 'sending':
        return <SendingVerification />;
      case 'sent':
      default:
        return <VerificationSent />;
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
