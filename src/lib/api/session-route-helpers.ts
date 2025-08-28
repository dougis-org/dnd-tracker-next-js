/**
 * Session-based API route helpers using Clerk authentication
 *
 * This module provides API route helpers that use Clerk for authentication
 * and session management, replacing the previous NextAuth implementation.
 *
 * Issue #652: Implement Clerk Authentication Middleware
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateAuth } from './route-helpers';


/**
 * Check if user has valid session using Clerk with enhanced error logging
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    const { userId } = await auth();
    const hasSession = !!userId;
    if (!hasSession) {
      console.debug('hasValidSession: No authenticated user found');
    }
    return hasSession;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('hasValidSession: Session validation failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Get current user ID using Clerk with enhanced error logging
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.debug('getCurrentUserId: No authenticated user found');
    }
    return userId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('getCurrentUserId: User ID extraction failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Get current session using Clerk with enhanced error logging
 */
export async function getCurrentSession() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      console.debug('getCurrentSession: No authenticated user found');
      return null;
    }

    return {
      user: {
        id: authResult.userId,
        // Note: Additional user data would need to be fetched from database
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('getCurrentSession: Session retrieval failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Get user subscription tier (Note: Requires database integration) with enhanced error logging
 */
export async function getCurrentUserTier(): Promise<string> {
  try {
    // TODO: Implement database query to get user tier
    // For now, return default tier
    console.warn('getCurrentUserTier not yet implemented for Clerk - using default tier');
    return 'free'; // Default tier
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('getCurrentUserTier: User tier extraction failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
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
  handleServiceResult,
  withAuth,
  withAuthAndAccess,
} from './route-helpers';
