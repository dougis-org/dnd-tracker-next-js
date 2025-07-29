import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthenticatedServerPageProps {
  children: ReactNode;
  fallbackUrl?: string;
}

/**
 * Server component wrapper for authenticated pages
 *
 * This component provides authentication at the server level, working in conjunction
 * with middleware protection. If middleware fails to redirect (rare edge cases),
 * this provides a server-side fallback.
 *
 * Benefits:
 * - Eliminates redundant client-side useSession() checks
 * - Provides consistent server-side authentication
 * - Reduces loading states and authentication flash
 * - Works seamlessly with middleware protection
 */
export default async function AuthenticatedServerPage({
  children,
  fallbackUrl = '/signin'
}: AuthenticatedServerPageProps) {
  const session = await auth();

  // Server-side redirect if no session (fallback to middleware)
  if (!session) {
    redirect(fallbackUrl);
    // This line is unreachable, but TypeScript doesn't know that redirect() never returns
    return null;
  }

  // Pass session context to children via server component props
  return (
    <div data-authenticated="true" data-user-id={session.user?.id}>
      {children}
    </div>
  );
}

/**
 * Hook-like function to get session data in server components
 * Use this instead of useSession() in pages wrapped with AuthenticatedServerPage
 */
export async function getServerSession() {
  const session = await auth();

  if (!session) {
    throw new Error('Session not found - component should be wrapped with AuthenticatedServerPage');
  }

  return session;
}