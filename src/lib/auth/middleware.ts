import { NextRequest, NextResponse } from 'next/server';
import { extractSessionIdFromCookie, isValidSessionIdFormat, isValidOrigin } from './session-utils';

export interface AuthMiddlewareConfig {
  publicRoutes: string[];
  protectedRoutes: string[];
  apiRoutes: string[];
  trustedOrigins: string[];
}

const defaultConfig: AuthMiddlewareConfig = {
  publicRoutes: [
    '/',
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/error',
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/signout',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email'
  ],
  protectedRoutes: [
    '/dashboard',
    '/characters',
    '/parties',
    '/encounters',
    '/combat',
    '/settings'
  ],
  apiRoutes: [
    '/api/users',
    '/api/characters',
    '/api/encounters',
    '/api/parties',
    '/api/combat'
  ],
  trustedOrigins: [
    'localhost:3000',
    'dnd-tracker-next-js.fly.dev',
    'dnd-tracker.fly.dev',
    'dndtracker.com',
    'www.dndtracker.com'
  ]
};

export class AuthMiddleware {
  private config: AuthMiddlewareConfig;

  constructor(config: Partial<AuthMiddlewareConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    try {
      // Check if route needs protection
      const isProtectedRoute = this.isProtectedRoute(pathname);
      const isProtectedAPI = this.isProtectedAPI(pathname);

      if (!isProtectedRoute && !isProtectedAPI) {
        return NextResponse.next();
      }

      // Validate origin in production
      if (process.env.NODE_ENV === 'production' && !isValidOrigin(request.url, this.config.trustedOrigins)) {
        console.warn(`Invalid origin for ${pathname}: ${request.url}`);
        return this.handleUnauthenticated(request, isProtectedAPI);
      }

      // Get session from cookie
      const sessionId = extractSessionIdFromCookie(request.headers.get('cookie'));
      if (!sessionId || !isValidSessionIdFormat(sessionId)) {
        console.log(`No valid session found for ${pathname}`);
        return this.handleUnauthenticated(request, isProtectedAPI);
      }

      // For middleware in Edge Runtime, we can't validate session directly
      // We rely on the session ID format validation and let API routes handle
      // actual session validation. If session is invalid, API routes will return 401.
      return NextResponse.next();
    } catch (error) {
      console.error(`Auth middleware error for ${pathname}:`, error);
      return this.handleUnauthenticated(request, this.isProtectedAPI(pathname));
    }
  }

  private isProtectedRoute(pathname: string): boolean {
    return this.config.protectedRoutes.some(route =>
      pathname.startsWith(route)
    );
  }

  private isProtectedAPI(pathname: string): boolean {
    return this.config.apiRoutes.some(route =>
      pathname.startsWith(route)
    );
  }


  private handleUnauthenticated(request: NextRequest, isAPI: boolean): NextResponse {
    if (isAPI) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          }
        },
        { status: 401 }
      );
    }

    try {
      const signInUrl = new URL('/signin', request.url);

      // Add callback URL for redirect after signin
      const currentUrl = request.url;
      try {
        const parsedCurrentUrl = new URL(currentUrl);
        const requestOrigin = parsedCurrentUrl.origin;
        const signInOrigin = signInUrl.origin;

        // Only set callback if from same origin
        if (requestOrigin === signInOrigin) {
          signInUrl.searchParams.set('callbackUrl', encodeURI(currentUrl));
        }
      } catch {
        console.warn('Invalid request URL for callback:', currentUrl);
      }

      return NextResponse.redirect(signInUrl);
    } catch (error) {
      console.error('Error creating redirect response:', error);
      // Fallback to simple redirect
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }
}

// Default middleware instance
const authMiddleware = new AuthMiddleware();

/**
 * Main middleware function for Next.js
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  return authMiddleware.handle(request);
}

/**
 * Named export for testing
 */
export async function testAuthMiddleware(request: NextRequest): Promise<NextResponse> {
  const authMiddlewareInstance = new AuthMiddleware();
  return authMiddlewareInstance.handle(request);
}