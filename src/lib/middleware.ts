import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * List of protected API route prefixes that require authentication
 */
const PROTECTED_API_ROUTES = [
  '/api/users',
  '/api/characters',
  '/api/encounters',
  '/api/combat',
  '/api/parties',
];

/**
 * List of public API routes that don't require authentication
 */
const PUBLIC_API_ROUTES = ['/api/auth', '/api/health', '/api/public'];

/**
 * Check if a route matches any in the given list
 */
function routeMatches(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname.startsWith(route));
}

/**
 * Check if an API route requires authentication
 */
export function isProtectedApiRoute(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  if (routeMatches(pathname, PUBLIC_API_ROUTES)) return false;
  return routeMatches(pathname, PROTECTED_API_ROUTES);
}

/**
 * Extract Bearer token from request headers
 */
export function extractBearerToken(headers: Headers): string | null {
  const authorization = headers.get('Authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

/**
 * Get authenticated user from Clerk with enhanced error logging
 */
async function getUserFromAuth(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.debug('getUserFromAuth: No authenticated user found');
    }
    return userId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('getUserFromAuth: Authentication check failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Create unauthorized response
 */
function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Verify authentication for API routes
 * Returns null if authenticated, or error response if not
 */
export async function requireAuthentication(
  _request: NextRequest
): Promise<NextResponse | null> {
  const userId = await getUserFromAuth();
  return userId ? null : createUnauthorizedResponse();
}

/**
 * Type for authenticated handler functions
 */
type AuthenticatedHandler = (
  _request: NextRequest,
  _userId: string
) => Promise<NextResponse>;

/**
 * Higher-order function to create authenticated API handlers
 */
export function createAuthenticatedHandler(handler: AuthenticatedHandler) {
  return async function authenticatedHandler(
    request: NextRequest
  ): Promise<NextResponse> {
    const userId = await getUserFromAuth();

    if (!userId) {
      return createUnauthorizedResponse();
    }

    try {
      return await handler(request, userId);
    } catch (error) {
      console.error('Authenticated handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility class for creating consistent API responses
 */
export class ApiResponse {

  /**
   * Create a success response
   */
  static success<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  /**
   * Create an error response
   */
  static error(message: string, status: number = 400): NextResponse {
    return NextResponse.json({ error: message }, { status });
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(
    message: string = 'Authentication required'
  ): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  /**
   * Create a forbidden response
   */
  static forbidden(message: string = 'Access denied'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  /**
   * Create a not found response
   */
  static notFound(message: string = 'Resource not found'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  /**
   * Create a server error response
   */
  static serverError(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Session utilities for checking authentication state with Clerk
 */
export class SessionUtils {

  /**
   * Check if user has required subscription tier
   * Note: This now requires separate database query since Clerk doesn't store custom user data
   */
  static async hasSubscriptionTier(_requiredTier: string): Promise<boolean> {
    try {
      const { userId } = await auth();
      if (!userId) return false;

      // TODO: Implement subscription tier check with database query
      // This will need to be implemented when user data is integrated
      console.warn('SessionUtils.hasSubscriptionTier not yet implemented for Clerk');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('SessionUtils.hasSubscriptionTier: Subscription tier check failed:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Get current user ID from Clerk with enhanced error logging
   */
  static async getUserId(): Promise<string | null> {
    try {
      const { userId } = await auth();
      if (!userId) {
        console.debug('SessionUtils.getUserId: No authenticated user found');
      }
      return userId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('SessionUtils.getUserId: Auth check failed:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Get user email from Clerk with enhanced error logging
   */
  static async getUserEmail(): Promise<string | null> {
    try {
      // Note: Getting user email requires additional Clerk API call
      // For now, this is not implemented as it requires user data fetching
      console.warn('SessionUtils.getUserEmail not yet implemented for Clerk');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('SessionUtils.getUserEmail: Email retrieval failed:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Check if user is authenticated with enhanced error logging
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { userId } = await auth();
      const isAuth = !!userId;
      if (!isAuth) {
        console.debug('SessionUtils.isAuthenticated: No authenticated user found');
      }
      return isAuth;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('SessionUtils.isAuthenticated: Authentication check failed:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }
}
