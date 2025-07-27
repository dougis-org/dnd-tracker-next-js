// Server-side session validation utilities (runs in Node.js runtime)
import { SessionManager } from './SessionManager';
import { extractSessionIdFromCookie, isValidSessionIdFormat } from './session-utils';

const sessionManager = new SessionManager();

export interface ServerUserInfo {
  userId: string;
  email: string;
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
}

/**
 * Validates session from request headers and returns user info
 * Use this in API routes to validate authentication
 */
export async function getServerSession(cookieHeader: string | null): Promise<ServerUserInfo | null> {
  const sessionId = extractSessionIdFromCookie(cookieHeader);

  if (!sessionId || !isValidSessionIdFormat(sessionId)) {
    return null;
  }

  try {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      email: session.email,
      subscriptionTier: session.subscriptionTier
    };
  } catch (error) {
    console.error('Server session validation error:', error);
    return null;
  }
}

/**
 * Middleware helper to add auth info to request headers
 * Use this pattern in API routes that need authentication
 */
export async function withAuth<T>(
  handler: (_userInfo: ServerUserInfo) => Promise<T>,
  cookieHeader: string | null
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const userInfo = await getServerSession(cookieHeader);

  if (!userInfo) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const data = await handler(userInfo);
    return { success: true, data };
  } catch (error) {
    console.error('API handler error:', error);
    return { success: false, error: 'Internal server error' };
  }
}