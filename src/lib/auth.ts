import { auth as clerkAuth } from '@clerk/nextjs/server';

/**
 * Get the current authenticated user from Clerk
 * Compatible replacement for NextAuth auth() function
 */
export async function auth() {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return null;
    }

    // Return a session-like object compatible with existing code
    return {
      user: {
        id: userId,
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}