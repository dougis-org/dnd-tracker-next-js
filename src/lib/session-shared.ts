/**
 * Shared utilities for session management across client and server
 */

/**
 * Subscription tier hierarchy for access control
 * Based on User model validation: ['free', 'seasoned', 'expert', 'master', 'guild']
 */
export const SUBSCRIPTION_TIERS = [
  'free',
  'seasoned',
  'expert',
  'master',
  'guild',
];

/**
 * Check if user has required subscription tier
 */
export function hasRequiredTier(
  userTier: string,
  requiredTier: string
): boolean {
  const userTierIndex = SUBSCRIPTION_TIERS.indexOf(userTier);
  const requiredTierIndex = SUBSCRIPTION_TIERS.indexOf(requiredTier);

  // If either tier is not found, return false
  if (userTierIndex === -1 || requiredTierIndex === -1) {
    return false;
  }

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
