'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthenticatedClientWrapperProps {
  children: ReactNode;
}

export default function AuthenticatedClientWrapper({
  children,
}: AuthenticatedClientWrapperProps) {
  const { status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Please sign in to continue.</div>;
  }

  return <>{children}</>;
}