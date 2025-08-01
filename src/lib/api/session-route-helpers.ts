/**
 * Session-based API route helpers using consistent session utilities
 *
 * This module provides API route helpers that use the unified session utilities
 * from session-config.ts, supporting both JWT and database session strategies.
 *
 * Issue #527: Phase 2.2 - Fix session storage and retrieval
 */

import { NextResponse } from 'next/server';
import { sessionUtils } from '@/lib/session-config';
import { validateAuth, validateUserAccess, withAuthAndAccess } from './route-helpers';
import { getAuthConfig } from '@/lib/session-config';


/**
 * Check if user has valid session using consistent utilities
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    return await sessionUtils.hasValidSession();
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Get current user ID using consistent session utilities
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    return await sessionUtils.getSessionUserId();
  } catch (error) {
    console.error('User ID extraction error:', error);
    return null;
  }
}

/**
 * Get current session using consistent session utilities
 */
export async function getCurrentSession() {
  try {
    return await sessionUtils.getCurrentSession();
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

/**
 * Get user subscription tier using consistent session utilities
 */
export async function getCurrentUserTier(): Promise<string> {
  try {
    return await sessionUtils.getSessionUserTier();
  } catch (error) {
    console.error('User tier extraction error:', error);
    return 'free'; // Default tier
  }
}

/**
 * Enhanced route handler with session strategy awareness
 */
export async function withEnhancedAuth<T>(
  callback: (_userId: string, _session: any, _tier: string) => Promise<T>
): Promise<T | NextResponse> {
  const { error, session } = await validateAuth();
  if (error) return error;

  const tier = await getCurrentUserTier();
  return await callback(session!.user.id, session, tier);
}

// Re-export utility functions for backward compatibility
export {
  createSuccessResponse,
  handleServiceError,
  handleUserServiceResult,
  createErrorResponse,
  handleZodValidationError,
  validateEncounterId,
  validateEncounterAccess,
  validateRequestBody,
  createValidatedRouteHandler,
  createSimpleRouteHandler,
  createGetRouteHandler,
  createDeleteRouteHandler,
  handleServiceResult,
} from './route-helpers';