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
  '/api/users(.*)',
  '/api/characters(.*)',
  '/api/encounters(.*)',
  '/api/combat(.*)',
  '/api/parties(.*)'
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
 * Handles authentication for protected API routes
 */
async function handleApiRouteAuthentication(
  auth: () => Promise<any>,
  _request: NextRequest
): Promise<NextResponse | null> {
  const { userId } = await auth();

  if (!userId) {
    return createUnauthenticatedApiResponse();
  }

  return null; // Continue processing
}

/**
 * Handles authentication for protected UI routes
 */
async function handleUiRouteAuthentication(
  auth: () => Promise<any>,
  request: NextRequest
): Promise<NextResponse | null> {
  const authObj = await auth();

  if (!authObj.userId) {
    return createSignInRedirect(request);
  }

  return null; // Continue processing
}

/**
 * Main Clerk middleware handler with improved structure and clarity
 */
export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Check if the current route requires authentication
  if (!isProtectedRoute(request)) {
    return NextResponse.next();
  }

  // Handle protected routes based on type (API vs UI)
  if (pathname.startsWith('/api/')) {
    const response = await handleApiRouteAuthentication(auth, request);
    if (response) return response;
  } else {
    const response = await handleUiRouteAuthentication(auth, request);
    if (response) return response;
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