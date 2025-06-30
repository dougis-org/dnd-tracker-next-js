/**
 * Shared utilities for session management across client and server
 */

/**
 * Subscription tier hierarchy for access control
 */
export const SUBSCRIPTION_TIERS = ['free', 'basic', 'premium', 'pro', 'enterprise'];

/**
 * Check if user has required subscription tier
 */
export function hasRequiredTier(userTier: string, requiredTier: string): boolean {
  const userTierIndex = SUBSCRIPTION_TIERS.indexOf(userTier);
  const requiredTierIndex = SUBSCRIPTION_TIERS.indexOf(requiredTier);
  return userTierIndex >= requiredTierIndex;
}

/**
 * Get user tier from session or token object
 */
export function getUserTier(user: any): string {
  return user?.subscriptionTier || 'free';
}

/**
 * Get user ID from session or token object
 */
export function extractUserId(user: any): string | null {
  return user?.id || user?.sub || null;
}

/**
 * Get user email from session or token object
 */
export function extractUserEmail(user: any): string | null {
  return user?.email || null;
}
