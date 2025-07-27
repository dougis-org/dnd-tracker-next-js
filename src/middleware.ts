import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from './lib/auth/middleware';

// Create auth middleware instance
const authMiddleware = new AuthMiddleware({
  // Custom configuration for this app
  trustedOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    'dnd-tracker-next-js.fly.dev',
    'dnd-tracker.fly.dev',
    'dndtracker.com',
    'www.dndtracker.com'
  ]
});

/**
 * Main middleware function that handles authentication for the application
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  return authMiddleware.handle(request);
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {
  matcher: [
    // Protected page routes
    '/dashboard/:path*',
    '/characters/:path*',
    '/encounters/:path*',
    '/parties/:path*',
    '/combat/:path*',
    '/settings/:path*',
    
    // Protected API routes
    '/api/users/:path*',
    '/api/characters/:path*',
    '/api/encounters/:path*',
    '/api/combat/:path*',
    '/api/parties/:path*',
  ],
};