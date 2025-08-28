import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Higher-order function that wraps API route handlers with authentication
 * Compatible replacement for NextAuth-based withAuth
 */
export function withAuth(
  handler: (_userId: string) => Promise<NextResponse>
) {
  return async (): Promise<NextResponse> => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      return await handler(session.user.id);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}