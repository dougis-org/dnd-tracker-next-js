import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isProtectedApiRoute } from '@/lib/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPageRoute = checkProtectedPageRoute(pathname);
  const isProtectedAPI = isProtectedApiRoute(pathname);

  if (!isProtectedPageRoute && !isProtectedAPI) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Enhanced token validation for Issue #438: Better authentication state management
    if (!token) {
      console.log(`Middleware: No token found for ${pathname}, redirecting to signin`);
      return handleUnauthenticatedRequest(request, isProtectedAPI);
    }

    // Check token expiration to prevent authentication bypass
    if (token.exp && Date.now() >= token.exp * 1000) {
      console.log(`Middleware: Expired token for ${pathname}, redirecting to signin`);
      return handleUnauthenticatedRequest(request, isProtectedAPI);
    }

    // Validate token has required fields
    if (!token.sub) {
      console.warn(`Middleware: Token missing user ID for ${pathname}`);
      return handleUnauthenticatedRequest(request, isProtectedAPI);
    }

    return NextResponse.next();
  } catch (error) {
    console.error(`Middleware: Token validation error for ${pathname}:`, error);
    return handleUnauthenticatedRequest(request, isProtectedAPI);
  }
}

function checkProtectedPageRoute(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/characters',
    '/encounters',
    '/parties',
    '/combat',
    '/settings'
  ];

  return protectedPaths.some(path => pathname.startsWith(path));
}

function handleUnauthenticatedRequest(request: NextRequest, isAPI: boolean): NextResponse {
  if (isAPI) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Enhanced redirect handling for Issue #438: Prevent invalid redirects
    const url = new URL('/signin', request.url);

    // Validate the request URL before using it as callback
    const requestUrl = request.url;
    try {
      const parsedRequestUrl = new URL(requestUrl);

      // Only set callbackUrl if it's from a trusted origin
      if (parsedRequestUrl.origin === url.origin) {
        url.searchParams.set('callbackUrl', encodeURI(requestUrl));
      } else {
        console.warn(`Middleware: Blocked callback to external origin: ${parsedRequestUrl.origin}`);
        // Don't set callbackUrl for external origins
      }
    } catch (urlError) {
      console.warn(`Middleware: Invalid request URL: ${requestUrl}`, urlError);
      // Don't set callbackUrl for invalid URLs
    }

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Middleware: Error handling unauthenticated request:', error);
    // Fallback: simple redirect without callback
    return NextResponse.redirect(new URL('/signin', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/characters/:path*',
    '/encounters/:path*',
    '/parties/:path*',
    '/combat/:path*',
    '/settings/:path*',
    '/api/users/:path*',
    '/api/characters/:path*',
    '/api/encounters/:path*',
    '/api/combat/:path*',
    '/api/parties/:path*',
  ],
};
