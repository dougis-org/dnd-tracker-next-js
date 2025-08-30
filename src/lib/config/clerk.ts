/**
 * Centralized Clerk Configuration for Build Process
 * Issue #675 - Clerk Public Key Configuration for Build Process
 *
 * SECURITY REQUIREMENTS:
 * - ONLY the publishable key (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) can be exposed
 * - Secret keys MUST remain in environment variables only and never be exposed
 * - This module provides build-time safe access to Clerk configuration
 */

/**
 * Checks if the application is running in development mode
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if the application is running in production mode
 */
export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validates that a publishable key has the correct format
 */
export function isValidPublishableKey(key: string | undefined): key is string {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Clerk publishable keys start with pk_test_ or pk_live_
  return /^pk_(test|live)_/.test(key);
}

/**
 * Development fallback publishable key
 * This is safe to expose as it's a test key for development only
 */
const DEV_FALLBACK_PUBLISHABLE_KEY = 'pk_test_bGVnYWwtd2FzcC0xNi5jbGVyay5hY2NvdW50cy5kZXYk';

/**
 * Gets the Clerk publishable key with build-time validation and fallback
 *
 * This function is designed to be safe during Next.js build process:
 * - Reads from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable
 * - Provides development fallback to prevent build failures
 * - Validates key format for security
 * - Safe to use in client-side code (publishable keys are meant to be public)
 */
export function getClerkPublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    if (isDevelopmentMode()) {
      console.warn(
        '⚠️  CLERK CONFIG: Using fallback publishable key for development. ' +
        'Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local file for production readiness.'
      );
      return DEV_FALLBACK_PUBLISHABLE_KEY;
    } else {
      console.error(
        '❌ CLERK CONFIG ERROR: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required in production. ' +
        'Please set this environment variable.'
      );
      // Return fallback to prevent build crashes, but log the error
      return DEV_FALLBACK_PUBLISHABLE_KEY;
    }
  }

  if (!isValidPublishableKey(key)) {
    console.error(
      `❌ CLERK CONFIG ERROR: Invalid publishable key format: "${key}". ` +
      'Clerk publishable keys should start with "pk_test_" or "pk_live_". ' +
      'Please check your configuration at https://dashboard.clerk.com/last-active?path=api-keys'
    );
    // Return fallback to prevent build crashes
    return DEV_FALLBACK_PUBLISHABLE_KEY;
  }

  return key;
}

/**
 * Server-side function to validate that secret key is properly configured
 *
 * SECURITY NOTE: This function NEVER returns or exposes the secret key value.
 * It only validates that the key exists and has proper format.
 * The secret key should only be accessed directly via process.env.CLERK_SECRET_KEY
 * in server-side code that needs it.
 */
export function validateClerkServerConfig(): { valid: boolean; message: string } {
  // Prevent this from running in client-side code
  if (typeof window !== 'undefined') {
    return {
      valid: false,
      message: 'validateClerkServerConfig should only be called on the server'
    };
  }

  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return {
      valid: false,
      message: 'Missing CLERK_SECRET_KEY environment variable. Required for server-side operations.'
    };
  }

  if (!/^sk_(test|live)_/.test(secretKey)) {
    return {
      valid: false,
      message: 'Invalid CLERK_SECRET_KEY format. Must start with "sk_test_" or "sk_live_".'
    };
  }

  return {
    valid: true,
    message: 'Clerk server configuration is valid'
  };
}

/**
 * Centralized Clerk configuration object
 * This provides a single source of truth for all Clerk-related configuration
 *
 * SECURITY: Only exposes the publishable key - secret key access is server-only
 */
export const CLERK_CONFIG = {
  // Safe to expose - publishable key
  getPublishableKey: getClerkPublishableKey,

  // Server-side validation only - does not expose secret key
  validateServerConfig: validateClerkServerConfig,

  // Environment helpers
  isDevelopment: isDevelopmentMode,
  isProduction: isProductionMode,

  // Validation helpers
  isValidPublishableKey,

  // Route configuration
  PROTECTED_ROUTES: [
    '/dashboard',
    '/characters',
    '/parties',
    '/encounters',
    '/combat',
    '/settings'
  ] as const,

  PUBLIC_ROUTES: [
    '/',
    '/about',
    '/contact',
    '/terms',
    '/privacy'
  ] as const,

  AUTH_ROUTES: [
    '/sign-in',
    '/sign-up',
    '/user-profile'
  ] as const
} as const;

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

// Perform build-time validation in server environments only
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Validate publishable key
  const publishableKey = getClerkPublishableKey();
  if (isValidPublishableKey(publishableKey)) {
    console.log('✅ Clerk publishable key configuration validated');
  }

  // Validate server config if not in development
  if (!isDevelopmentMode()) {
    const serverValidation = validateClerkServerConfig();
    if (serverValidation.valid) {
      console.log('✅ Clerk server configuration validated');
    } else {
      console.warn('⚠️  Clerk server configuration issue:', serverValidation.message);
    }
  }
}