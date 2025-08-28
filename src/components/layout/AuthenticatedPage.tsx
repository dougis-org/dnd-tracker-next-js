'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { AppLayout } from './AppLayout';

interface AuthenticatedPageProps {
  children: React.ReactNode;
  loadingMessage?: string;
  unauthenticatedMessage?: string;
}

export function AuthenticatedPage({
  children,
  loadingMessage = 'Loading...',
  unauthenticatedMessage = 'Please sign in to access this page.'
}: AuthenticatedPageProps) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <AppLayout>
      {!isLoaded && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{loadingMessage}</div>
        </div>
      )}

      {isLoaded && !isSignedIn && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{unauthenticatedMessage}</div>
        </div>
      )}

      {isLoaded && isSignedIn && children}
    </AppLayout>
  );
}