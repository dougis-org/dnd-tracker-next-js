/**
 * Centralized Clerk Configuration for Build Process
 * Issue #675 - Clerk Public Key Configuration for Build Process
 *
 * This module provides centralized, build-time safe access to Clerk configuration.
 * It ensures that Clerk public keys are properly available during Next.js static
 * page generation while providing clear error handling and validation.
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
 * Clerk publishable key constant (read from environment variable, with fallback)
 * This value is safe to expose to the client.
 * Falls back to a hardcoded test key if the environment variable is not set.
 */
export const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_bGVnYWwtd2FzcC0xNi5jbGVyay5hY2NvdW50cy5kZXYk';

export function getClerkPublishableKey(): string {
  if (!isValidPublishableKey(CLERK_PUBLISHABLE_KEY)) {
    throw new Error(
      `CLERK CONFIGURATION ERROR: Invalid publishable key format: "${CLERK_PUBLISHABLE_KEY}". ` +
        'Clerk publishable keys should start with "pk_test_" or "pk_live_". '
    );
  }
  return CLERK_PUBLISHABLE_KEY;
}

/**
 * Gets the Clerk secret key (server-side only)
 * This function must never be used in client-side code!
 * Throws an error if accessed on the client or if the key is missing/invalid.
 */
export function getClerkSecretKey(): string {
  // Prevent accidental exposure in client bundles
  if (typeof window !== 'undefined') {
    throw new Error(
      'CLERK_SECRET_KEY must never be accessed in client-side code!'
    );
  }
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    if (isProductionMode()) {
      throw new Error(
        'CLERK CONFIGURATION ERROR: Missing CLERK_SECRET_KEY in production environment.'
      );
    } else {
      throw new Error(
        'CLERK CONFIGURATION ERROR: CLERK_SECRET_KEY not found.'
      );
    }
  }
  if (!/^sk_(test|live)_/.test(key)) {
    throw new Error(
      'CLERK CONFIGURATION ERROR: Invalid secret key format. Must start with "sk_test_" or "sk_live_".'
    );
  }
  return key;
}

/**
 * Validates the complete Clerk build configuration
 * This function should be called during build time to ensure all required
 * configuration is present and valid.
 */
export function validateClerkBuildConfig(): void {
  const errors: string[] = [];

  // Validate publishable key (required for build)
  if (!isValidPublishableKey(CLERK_PUBLISHABLE_KEY)) {
    errors.push(
      `Invalid CLERK_PUBLISHABLE_KEY format: "${CLERK_PUBLISHABLE_KEY}". ` +
        'Must start with "pk_test_" or "pk_live_".'
    );
  }

  // Validate secret key (required for server-side operations)
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    errors.push(
      'Missing CLERK_SECRET_KEY environment variable. ' +
        'This is required for server-side Clerk operations.'
    );
  } else if (!/^sk_(test|live)_/.test(secretKey)) {
    errors.push(
      'Invalid CLERK_SECRET_KEY format. Must start with "sk_test_" or "sk_live_".'
    );
  }

  if (errors.length > 0) {
    const errorMessage = [
      'CLERK CONFIGURATION ERRORS:',
      ...errors.map(error => `  - ${error}`),
      '',
      'Please check your configuration:',
      '  - CLERK_PUBLISHABLE_KEY is set in src/lib/config/clerk.ts',
      '  - CLERK_SECRET_KEY is set as an environment variable (never exposed to client)',
      '  - Get your keys at: https://dashboard.clerk.com/last-active?path=api-keys',
    ].join('\n');

    throw new Error(errorMessage);
  }
}

/**
 * Centralized Clerk configuration object
 * This provides a single source of truth for all Clerk-related configuration
 */
export const CLERK_CONFIG = {
  // Get keys with validation
  getPublishableKey: getClerkPublishableKey,
  getSecretKey: getClerkSecretKey,

  // Environment helpers
  isDevelopment: isDevelopmentMode,
  isProduction: isProductionMode,

  // Validation helpers
  isValidPublishableKey,
  validateBuildConfig: validateClerkBuildConfig,

  // Routes configuration (from existing clerk-config.ts)
  PROTECTED_ROUTES: [
    '/dashboard',
    '/characters',
    '/parties',
    '/encounters',
    '/combat',
    '/settings',
  ] as const,

  PUBLIC_ROUTES: ['/', '/about', '/contact', '/terms', '/privacy'] as const,

  AUTH_ROUTES: ['/sign-in', '/sign-up', '/user-profile'] as const,
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
  return (
    publicRoutes.includes(pathname) ||
    CLERK_CONFIG.AUTH_ROUTES.some(route => pathname.startsWith(route))
  );
}

/**
 * Explicitly initialize and validate Clerk configuration.
 * Call this function at app startup or build time as needed.
 */
export function initializeClerkConfigValidation(): void {
  if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
    try {
      validateClerkBuildConfig();
      console.log('✅ Clerk configuration validated successfully');
    } catch (error) {
      // In development, log the error but don't crash
      if (isDevelopmentMode()) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error(
            '⚠️  Clerk configuration validation failed:',
            (error as Error).message
          );
        } else {
          console.error('⚠️  Clerk configuration validation failed:', error);
        }
        console.log(
          '💡 This is not fatal in development, but should be fixed before production'
        );
      } else {
        // In production/build, this should be fatal
        throw error;
      }
    }
  }
}
