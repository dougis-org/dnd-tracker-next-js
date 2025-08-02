/**
 * Shared session utility functions
 * Eliminates code duplication between auth-database-session.ts and session-config.ts
 */

/**
 * Helper function to get current session with enhanced error handling
 */
export async function getCurrentSession(auth: any) {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Helper function to check if user has valid session
 */
export async function hasValidSession(auth: any): Promise<boolean> {
  try {
    const session = await getCurrentSession(auth);

    if (!session?.user?.id) {
      return false;
    }

    // Check if session has expired
    if (session.expires) {
      const expiresAt = new Date(session.expires);
      if (expiresAt <= new Date()) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Helper function to get user ID from session
 */
export async function getSessionUserId(auth: any): Promise<string | null> {
  try {
    const session = await getCurrentSession(auth);
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting session user ID:', error);
    return null;
  }
}

/**
 * Helper function to get user subscription tier from session
 */
export async function getSessionUserTier(auth: any): Promise<string> {
  try {
    const session = await getCurrentSession(auth);
    return session?.user?.subscriptionTier || 'free';
  } catch (error) {
    console.error('Error getting session user tier:', error);
    return 'free';
  }
}