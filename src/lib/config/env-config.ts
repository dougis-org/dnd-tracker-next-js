/**
 * Environment Configuration Utilities (Issue #482)
 *
 * Centralized and secure access to environment variables
 * following NextAuth patterns and security best practices
 */

/**
 * Safely retrieves NEXTAUTH_SECRET environment variable
 * Following NextAuth's pattern from @auth/core
 *
 * @returns The NextAuth secret or undefined if not available
 */
export function getNextAuthSecret(): string | undefined {
  // Follow NextAuth's precedence: AUTH_SECRET first, then NEXTAUTH_SECRET
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/**
 * Safely retrieves NEXTAUTH_URL environment variable
 * Following NextAuth's pattern from @auth/core
 *
 * @returns The NextAuth URL or undefined if not available
 */
export function getNextAuthUrl(): string | undefined {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
}

/**
 * Gets the session cookie name based on environment
 * Matches the pattern used in auth.ts configuration
 *
 * @returns The appropriate session cookie name
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

/**
 * Validates that required environment variables are available
 * Useful for startup checks and debugging
 *
 * @returns Object with validation results
 */
export function validateEnvironmentConfig() {
  const secret = getNextAuthSecret();
  const url = getNextAuthUrl();

  return {
    hasSecret: !!secret,
    hasUrl: !!url,
    cookieName: getSessionCookieName(),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}