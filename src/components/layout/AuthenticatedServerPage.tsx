import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { ReactNode } from 'react';

interface AuthenticatedServerPageProps {
  children: ReactNode;
  fallbackUrl?: string;
}

export default async function AuthenticatedServerPage({
  children,
  fallbackUrl = '/signin'
}: AuthenticatedServerPageProps) {
  const session = await auth();

  if (!session?.userId) {
    redirect(fallbackUrl as Route);
  }

  return <>{children}</>;
}