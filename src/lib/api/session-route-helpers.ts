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
import { getAuthConfig } from '@/lib/session-config';

/**
 * Validate authentication using consistent session utilities
 */
export async function validateAuth() {
  try {
    const { auth } = await getAuthConfig();
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        ),
        session: null
      };
    }

    return { error: null, session };
  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      error: NextResponse.json(
        { success: false, message: 'Authentication validation failed' },
        { status: 401 }
      ),
      session: null
    };
  }
}

/**
 * Higher-level wrapper that validates authentication and executes callback with user ID
 * Uses consistent session utilities
 */
export async function withAuth<T>(
  callback: (_userId: string, _session: any) => Promise<T>
): Promise<T | NextResponse> {
  const { error, session } = await validateAuth();
  if (error) return error;

  return await callback(session!.user.id, session);
}

/**
 * Validates user access using consistent session utilities
 */
export async function validateUserAccess(requestedUserId: string) {
  const { error, session } = await validateAuth();
  if (error) return error;

  if (requestedUserId !== session!.user.id) {
    return NextResponse.json(
      { success: false, message: 'You can only access your own profile' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Wrapper for routes that need both auth and user access validation
 */
export async function withAuthAndAccess(
  params: Promise<{ id: string }>,
  callback: (_userId: string, _session: any) => Promise<Response>
): Promise<Response> {
  try {
    const { error, session } = await validateAuth();
    if (error) return error;

    const { id: userId } = await params;
    const accessError = await validateUserAccess(userId);
    if (accessError) return accessError;

    return await callback(userId, session!);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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