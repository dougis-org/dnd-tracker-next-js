'use client';

import { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

interface AuthenticatedClientWrapperProps {
  children: ReactNode;
}

export default function AuthenticatedClientWrapper({
  children,
}: AuthenticatedClientWrapperProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div>Please sign in to continue.</div>;
  }

  return <>{children}</>;
}