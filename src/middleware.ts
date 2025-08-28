import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';

/**
 * Protected routes that require authentication
 * These routes will trigger authentication checks
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/characters(.*)',
  '/encounters(.*)',
  '/parties(.*)',
  '/combat(.*)',
  '/settings(.*)',
]);

/**
 * Define protected API routes that require authentication
 */
const isProtectedApiRoute = createRouteMatcher([
  '/api/users(.*)',
  '/api/characters(.*)',
  '/api/encounters(.*)',
  '/api/parties(.*)',
  '/api/combat(.*)',
]);

/**
 * Creates a JSON response for unauthenticated API requests
 */
function createUnauthenticatedApiResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Creates a redirect response to sign-in page for unauthenticated UI routes
 */
function createSignInRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL('/sign-in', request.url);
  signInUrl.searchParams.set('redirect_url', request.url);
  return NextResponse.redirect(signInUrl);
}

/**
 * Optimized Clerk middleware handler with efficiency improvements
 * - Calls auth() only once per request for better performance
 * - Early return for unprotected routes
 */
export default clerkMiddleware(async (auth, req) => {
  // Check if route needs protection
  const isApiRoute = isProtectedApiRoute(req);
  const isPageRoute = isProtectedRoute(req);
  
  // If route doesn't need protection, continue
  if (!isApiRoute && !isPageRoute) {
    return NextResponse.next();
  }

  // Get auth session once for efficiency
  const session = await auth();
  
  // Handle unauthenticated requests
  if (!session.userId) {
    if (isApiRoute) {
      return createUnauthenticatedApiResponse();
    } else {
      // Redirect to Clerk's sign-in page for page routes
      return createSignInRedirect(req);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};