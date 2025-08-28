/**
 * Clerk Configuration
 *
 * This file contains basic Clerk configuration and utilities for the D&D Tracker application.
 * It replaces the previous NextAuth configuration in auth.ts.
 */

/**
 * Required Clerk environment variables
 */
type ClerkEnvVar = 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' | 'CLERK_SECRET_KEY';

/**
 * Validates that required Clerk environment variables are set
 */
export function validateClerkEnvVars(): void {
  const requiredVars: readonly ClerkEnvVar[] = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ] as const;

  const missingVars = requiredVars.filter((varName: ClerkEnvVar) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Clerk environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file and ensure all Clerk variables are set.'
    );
  }
}

/**
 * Clerk-specific constants for the application
 */
export const CLERK_CONFIG = {
  // Protected routes that require authentication
  PROTECTED_ROUTES: [
    '/dashboard',
    '/characters',
    '/parties',
    '/encounters',
    '/combat',
    '/settings'
  ] as const,

  // Public routes that should be accessible without authentication
  PUBLIC_ROUTES: [
    '/',
    '/about',
    '/contact',
    '/terms',
    '/privacy'
  ] as const,

  // Authentication routes handled by Clerk
  AUTH_ROUTES: [
    '/sign-in',
    '/sign-up',
    '/user-profile'
  ] as const
};

/**
 * Helper function to check if a route is protected
 */
export function isProtectedRoute(pathname: string): boolean {
  return CLERK_CONFIG.PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  );
}

/**
 * Helper function to check if a route is public
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = CLERK_CONFIG.PUBLIC_ROUTES as readonly string[];
  return publicRoutes.includes(pathname) ||
    CLERK_CONFIG.AUTH_ROUTES.some(route => pathname.startsWith(route));
}

// Validate environment variables on module load in non-production environments
if (process.env.NODE_ENV !== 'test') {
  validateClerkEnvVars();
}