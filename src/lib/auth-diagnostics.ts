/**
 * Authentication Diagnostics Utilities - Issue #620
 * Tools to help diagnose and fix authentication persistence issues
 */

import { UserService } from '@/lib/services';
import { auth } from './auth';
import { connectToDatabase } from './db';

interface AuthDiagnostics {
  sessionExists: boolean;
  userExists: boolean;
  userVerified: boolean;
  tokenValid: boolean;
  databaseConnected: boolean;
  userDetails?: {
    id: string;
    email: string;
    isEmailVerified: boolean;
    lastLoginAt?: Date;
  };
  errors: string[];
}

/**
 * Comprehensive authentication diagnostics
 */
export async function diagnoseAuthIssues(email: string): Promise<AuthDiagnostics> {
  const diagnostics: AuthDiagnostics = {
    sessionExists: false,
    userExists: false,
    userVerified: false,
    tokenValid: false,
    databaseConnected: false,
    errors: [],
  };

  try {
    // Test database connection
    try {
      await connectToDatabase();
      diagnostics.databaseConnected = true;
    } catch (dbError) {
      diagnostics.errors.push(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Check if user exists in database
    if (diagnostics.databaseConnected) {
      try {
        const userResult = await UserService.getUserByEmail(email);
        if (userResult.success && userResult.data) {
          diagnostics.userExists = true;
          diagnostics.userVerified = userResult.data.isEmailVerified;
          diagnostics.userDetails = {
            id: userResult.data.id,
            email: userResult.data.email,
            isEmailVerified: userResult.data.isEmailVerified,
            lastLoginAt: userResult.data.lastLoginAt,
          };
        } else {
          diagnostics.errors.push('User not found in database');
        }
      } catch (userError) {
        diagnostics.errors.push(`User lookup failed: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    // Check session status
    try {
      const session = await auth();
      if (session && session.user) {
        diagnostics.sessionExists = true;
        diagnostics.tokenValid = Boolean(session.user.id && session.user.email);

        if (!diagnostics.tokenValid) {
          diagnostics.errors.push('Session exists but token data is incomplete');
        }
      } else {
        diagnostics.errors.push('No active session found');
      }
    } catch (sessionError) {
      diagnostics.errors.push(`Session check failed: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
    }

  } catch (error) {
    diagnostics.errors.push(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return diagnostics;
}

/**
 * Test authentication with provided credentials
 */
export async function testAuthentication(email: string, password: string): Promise<{
  success: boolean;
  authResult?: any;
  diagnostics: AuthDiagnostics;
  errors: string[];
}> {
  const errors: string[] = [];
  let authResult;

  try {
    // Test authentication
    authResult = await UserService.authenticateUser({ email, password });

    if (!authResult.success) {
      errors.push(`Authentication failed: ${authResult.error?.message || 'Unknown error'}`);
    }
  } catch (authError) {
    errors.push(`Authentication error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
  }

  // Run diagnostics
  const diagnostics = await diagnoseAuthIssues(email);

  return {
    success: Boolean(authResult?.success),
    authResult,
    diagnostics,
    errors: [...errors, ...diagnostics.errors],
  };
}

/**
 * Repair session for a user (force token refresh)
 */
export async function repairUserSession(email: string): Promise<{
  success: boolean;
  message: string;
  repairActions: string[];
}> {
  const repairActions: string[] = [];

  try {
    // Check if user exists
    const userResult = await UserService.getUserByEmail(email);
    if (!userResult.success || !userResult.data) {
      return {
        success: false,
        message: 'User not found - cannot repair session',
        repairActions,
      };
    }

    repairActions.push('User found in database');

    // Update last login to refresh user state
    try {
      const User = (await import('./models/User')).default;
      const user = await User.findByEmail(email);
      if (user) {
        await user.updateLastLogin();
        repairActions.push('Updated user last login timestamp');
      }
    } catch {
      repairActions.push('Failed to update user timestamp');
    }

    return {
      success: true,
      message: 'Session repair attempted - user should try logging in again',
      repairActions,
    };
  } catch (error) {
    return {
      success: false,
      message: `Session repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      repairActions,
    };
  }
}

/**
 * Development utility to log authentication state
 */
export async function logAuthState(email?: string): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('=== Authentication State Debug ===');

  try {
    const session = await auth();
    console.log('Session:', {
      exists: Boolean(session),
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        verified: session.user.isEmailVerified,
        tier: session.user.subscriptionTier,
      } : null,
    });
  } catch (error) {
    console.log('Session error:', error);
  }

  if (email) {
    const diagnostics = await diagnoseAuthIssues(email);
    console.log('User diagnostics:', diagnostics);
  }

  console.log('===================================');
}