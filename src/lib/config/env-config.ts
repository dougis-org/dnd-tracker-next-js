/**
 * Environment Configuration Utilities (Issue #482)
 *
 * Centralized and secure access to environment variables
 * Updated to use Clerk authentication
 *
 * NOTE: For Clerk-specific configuration, prefer using @/lib/config/clerk
 * which provides build-time validation and better error handling.
 */

import {
  getClerkPublishableKey as getCentralizedPublishableKey,
  validateClerkServerConfig,
} from './clerk';

/**
 * Safely retrieves Clerk publishable key environment variable
 *
 * @deprecated Use getClerkPublishableKey from @/lib/config/clerk instead
 * @returns The Clerk publishable key or undefined if not available
 */
export function getClerkPublishableKey(): string {
  return getCentralizedPublishableKey();
}

/**
 * DEPRECATED: Secret keys are no longer exposed through this module for security.
 * Server-side code should access secret keys directly from process.env.CLERK_SECRET_KEY
 * or use validateClerkServerConfig from @/lib/config/clerk for validation only.
 *
 * @deprecated Secret keys are not exposed for security reasons
 * @throws Error explaining security policy
 */
export function getClerkSecretKey(): never {
  throw new Error(
    'SECURITY: Secret keys are no longer exposed through configuration modules. ' +
    'Server-side code should access process.env.CLERK_SECRET_KEY directly or use validateClerkServerConfig().'
  );
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
  const serverValidation = validateClerkServerConfig();

  return {
    hasPublishableKey: !!publishableKey,
    hasSecretKey: serverValidation.valid,
    cookieName: getSessionCookieName(),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}
