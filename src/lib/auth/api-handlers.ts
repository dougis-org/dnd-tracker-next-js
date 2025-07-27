import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from './SessionManager';
import { UserService } from '../services/UserService';
import { z } from 'zod';

const sessionManager = new SessionManager();

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
});

/**
 * Handles user sign in requests
 */
export async function signInHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await parseRequestBody(request);
    const validatedData = signInSchema.parse(body);

    // Authenticate user
    const authResult = await UserService.authenticateUser({
      email: validatedData.email,
      password: validatedData.password,
      rememberMe: validatedData.rememberMe
    });

    if (!authResult.success || !authResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: authResult.error?.message || 'Authentication failed',
            code: authResult.error?.code || 'AUTHENTICATION_FAILED'
          }
        },
        { status: 401 }
      );
    }

    // Create session
    const user = authResult.data.user;
    const sessionId = await sessionManager.createSession(
      {
        userId: user.id?.toString() || '',
        email: user.email,
        subscriptionTier: user.subscriptionTier || 'free'
      },
      undefined,
      validatedData.rememberMe
    );

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier
      }
    });

    setSessionCookie(response, sessionId, validatedData.rememberMe);
    return response;

  } catch (error) {
    console.error('Sign in error:', error);
    return handleAuthError(error);
  }
}

/**
 * Handles user sign up requests
 */
export async function signUpHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await parseRequestBody(request);
    const validatedData = signUpSchema.parse(body);

    // Create user - generate username from email for now
    const createResult = await UserService.createUser({
      ...validatedData,
      username: validatedData.email.split('@')[0], // Generate username from email
      confirmPassword: validatedData.password, // Required field
      agreeToTerms: true, // Assume terms are agreed
      subscribeToNewsletter: false // Default value
    });

    if (!createResult.success || !createResult.data) {
      const statusCode = createResult.error?.code === 'EMAIL_EXISTS' ? 409 : 400;
      return NextResponse.json(
        {
          success: false,
          error: {
            message: createResult.error?.message || 'User creation failed',
            code: createResult.error?.code || 'USER_CREATION_FAILED'
          }
        },
        { status: statusCode }
      );
    }

    // Create session for new user
    const user = createResult.data.user;
    const sessionId = await sessionManager.createSession({
      userId: user.id?.toString() || '',
      email: user.email,
      subscriptionTier: user.subscriptionTier || 'free'
    });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier
        }
      },
      { status: 201 }
    );

    setSessionCookie(response, sessionId, false);
    return response;

  } catch (error) {
    console.error('Sign up error:', error);
    return handleAuthError(error);
  }
}

/**
 * Handles user sign out requests
 */
export async function signOutHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract session ID from cookie
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;

    // Delete session if it exists
    if (sessionId) {
      await sessionManager.deleteSession(sessionId);
    }

    // Create response and clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });

    clearSessionCookie(response);
    return response;

  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Sign out failed',
          code: 'SIGNOUT_FAILED'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Gets current user session info
 */
export async function sessionHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract session ID from cookie
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

    // Get session data
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        subscriptionTier: session.subscriptionTier
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Session check failed',
          code: 'SESSION_CHECK_FAILED'
        }
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function parseRequestBody(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON in request body');
  }
}

function setSessionCookie(response: NextResponse, sessionId: string, rememberMe: boolean): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 24 hours

  const cookieOptions = [
    `session=${sessionId}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly'
  ];

  if (isProduction) {
    cookieOptions.push('Secure');
    cookieOptions.push('SameSite=Strict');
  } else {
    cookieOptions.push('SameSite=Lax');
  }

  response.headers.set('Set-Cookie', cookieOptions.join('; '));
}

function clearSessionCookie(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = [
    'session=',
    'Max-Age=0',
    'Path=/',
    'HttpOnly'
  ];

  if (isProduction) {
    cookieOptions.push('Secure');
    cookieOptions.push('SameSite=Strict');
  } else {
    cookieOptions.push('SameSite=Lax');
  }

  response.headers.set('Set-Cookie', cookieOptions.join('; '));
}

function handleAuthError(error: any): NextResponse {
  console.error('Auth error:', error);

  // Handle validation errors
  if (error?.issues) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation error: ' + error.issues.map((issue: any) => issue.message).join(', '),
          code: 'VALIDATION_ERROR'
        }
      },
      { status: 400 }
    );
  }

  // Handle JSON parsing errors
  if (error.message?.includes('Invalid JSON')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        }
      },
      { status: 400 }
    );
  }

  // Default server error
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }
    },
    { status: 500 }
  );
}