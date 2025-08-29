/**
 * Environment Configuration Utilities (Issue #482)
 *
 * Centralized and secure access to environment variables
 * Updated to use Clerk authentication
 */

/**
 * Safely retrieves Clerk publishable key environment variable
 *
 * @returns The Clerk publishable key or undefined if not available
 */
export function getClerkPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

/**
 * Safely retrieves Clerk secret key environment variable
 *
 * @returns The Clerk secret key or undefined if not available
 */
export function getClerkSecretKey(): string | undefined {
  return process.env.CLERK_SECRET_KEY;
}

/**
 * Gets the session cookie name based on environment
 * Updated to use Clerk's session management
 *
 * @returns The appropriate session cookie name
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-clerk-session'
    : 'clerk-session';
}

/**
 * Validates that required Clerk environment variables are available
 * Useful for startup checks and debugging
 *
 * @returns Object with validation results
 */
export function validateEnvironmentConfig() {
  const publishableKey = getClerkPublishableKey();
  const secretKey = getClerkSecretKey();

  return {
    hasPublishableKey: !!publishableKey,
    hasSecretKey: !!secretKey,
    cookieName: getSessionCookieName(),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}