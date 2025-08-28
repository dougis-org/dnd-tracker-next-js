import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes that require authentication
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

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Protect all routes defined in isProtectedRoute
  if (isProtectedRoute(request)) {
    // For API routes, return JSON error if not authenticated
    if (pathname.startsWith('/api/')) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } else {
      // For regular routes, redirect to sign-in
      const authObj = await auth();
      if (!authObj.userId) {
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('redirect_url', request.url);
        return NextResponse.redirect(signInUrl);
      }
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