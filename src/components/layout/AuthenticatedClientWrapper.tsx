'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthenticatedClientWrapperProps {
  children: ReactNode;
  userId?: string;
  fallback?: ReactNode;
}

/**
 * Client wrapper for pages that need client-side functionality
 * but are protected by middleware.
 *
 * This component assumes authentication is handled by middleware,
 * so it doesn't show loading states or redirect logic.
 * It only provides session data to child components.
 *
 * Use this when:
 * - Page needs client-side hooks or interactions
 * - Authentication is already handled by middleware
 * - You want to eliminate authentication loading states
 */
export default function AuthenticatedClientWrapper({
  children,
  userId: _userId,
  fallback = <UnexpectedAuthError />
}: AuthenticatedClientWrapperProps) {
  const { data: session, status } = useSession();

  // If middleware is working correctly, we should never see loading
  // This is a minimal fallback for edge cases
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If middleware is working correctly, we should never be unauthenticated
  // This indicates a middleware configuration issue
  if (status === 'unauthenticated') {
    return fallback;
  }

  return (
    <div data-client-authenticated="true" data-session-user-id={session?.user?.id}>
      {children}
    </div>
  );
}

/**
 * Error component shown when middleware protection fails
 */
function UnexpectedAuthError() {
  return (
    <div className="flex items-center justify-center h-64 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-destructive">Authentication Error</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          You should have been redirected to sign in. This may indicate a configuration issue.
        </p>
        <div className="pt-2">
          <a
            href="/signin"
            className="text-sm underline text-destructive hover:text-destructive/80"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}