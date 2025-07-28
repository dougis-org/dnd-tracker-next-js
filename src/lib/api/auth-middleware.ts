/**
 * Centralized API Route Authentication Middleware
 *
 * This module provides a unified authentication system for all API routes.
 * By centralizing auth logic here, we can easily modify authentication
 * behavior across the entire application in one location.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, ServerUserInfo } from '@/lib/auth/server-session';

/**
 * Standard API response interfaces
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  pagination?: any;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  userInfo: ServerUserInfo;
  userId: string;
}

/**
 * Centralized authentication validation
 * Returns user info or throws authentication error
 */
export async function validateAuthentication(request: NextRequest): Promise<AuthResult> {
  const cookieHeader = request.headers.get('cookie');
  const userInfo = await getServerSession(cookieHeader);

  if (!userInfo?.userId) {
    throw new AuthenticationError('Authentication required');
  }

  return {
    userInfo,
    userId: userInfo.userId
  };
}

/**
 * Custom error classes for better error handling
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public _details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Standard error response creator
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 400,
  _details?: any
): NextResponse<ApiErrorResponse> {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return NextResponse.json(
    {
      success: false,
      message: errorMessage,
      ...(_details && { details: _details })
    },
    { status }
  );
}

/**
 * Standard success response creator
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  pagination?: any,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(pagination && { pagination })
    },
    { status }
  );
}

/**
 * Error handler that maps error types to appropriate HTTP responses
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  if (error instanceof AuthenticationError) {
    return createErrorResponse(error.message, 401);
  }

  if (error instanceof ValidationError) {
    return createErrorResponse(error.message, 400, error._details);
  }

  if (error instanceof NotFoundError) {
    return createErrorResponse(error.message, 404);
  }

  if (error instanceof ForbiddenError) {
    return createErrorResponse(error.message, 403);
  }

  // Generic error handling
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      return createErrorResponse(error.message, 404);
    }

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return createErrorResponse(error.message, 401);
    }

    if (message.includes('forbidden') || message.includes('access denied')) {
      return createErrorResponse(error.message, 403);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return createErrorResponse(error.message, 400);
    }
  }

  // Fallback for unknown errors
  return createErrorResponse('Internal server error', 500);
}

/**
 * Higher-order function that wraps API route handlers with authentication
 * This is the primary function that all protected routes should use
 */
export function withApiAuth<T = any>(
  // eslint-disable-next-line no-unused-vars
  handler: (userInfo: AuthResult, request: NextRequest, context?: any) => Promise<NextResponse<T | ApiErrorResponse>>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse<T | ApiErrorResponse>> => {
    try {
      const authResult = await validateAuthentication(request);
      return await handler(authResult, request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Higher-order function for routes that need user ID validation
 * Ensures the authenticated user can only access their own resources
 */
export function withUserOwnership<T = any>(
  // eslint-disable-next-line no-unused-vars
  handler: (userInfo: AuthResult, request: NextRequest, context: any) => Promise<NextResponse<T | ApiErrorResponse>>,
  // eslint-disable-next-line no-unused-vars
  getUserIdFromContext: (context: any) => Promise<string> | string = async (ctx) => {
    // Default: extract user ID from route params
    const params = await ctx.params;
    return params.id;
  }
) {
  return withApiAuth<T>(async (authResult, request, context) => {
    const requestedUserId = await getUserIdFromContext(context);

    if (requestedUserId !== authResult.userId) {
      throw new ForbiddenError('You can only access your own resources');
    }

    return await handler(authResult, request, context);
  });
}

/**
 * Higher-order function for routes that need request body validation
 */
export function withBodyValidation<TBody, TResponse = any>(
  // eslint-disable-next-line no-unused-vars
  validator: (body: any) => TBody,
  // eslint-disable-next-line no-unused-vars
  handler: (userInfo: AuthResult, validatedBody: TBody, request: NextRequest, context?: any) => Promise<NextResponse<TResponse | ApiErrorResponse>>
) {
  return withApiAuth<TResponse>(async (authResult, request, context) => {
    try {
      const body = await request.json();
      const validatedBody = validator(body);
      return await handler(authResult, validatedBody, request, context);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid JSON in request body');
      }
      throw error;
    }
  });
}

/**
 * Utility function to extract and validate route parameters
 */
export async function validateRouteParam(
  params: Promise<{ [key: string]: string }>,
  paramName: string,
  errorMessage?: string
): Promise<string> {
  const resolvedParams = await params;
  const value = resolvedParams[paramName];

  if (!value || value.trim() === '') {
    throw new ValidationError(errorMessage || `${paramName} is required`);
  }

  return value;
}

/**
 * Helper for parsing query parameters with type safety
 */
export function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return {
    // String parameters
    getString: (key: string, defaultValue?: string) => searchParams.get(key) || defaultValue,

    // Number parameters
    getNumber: (key: string, defaultValue?: number) => {
      const value = searchParams.get(key);
      if (!value) return defaultValue;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },

    // Boolean parameters
    getBoolean: (key: string, defaultValue?: boolean) => {
      const value = searchParams.get(key);
      if (!value) return defaultValue;
      return value.toLowerCase() === 'true';
    },

    // Array parameters (comma-separated)
    getArray: (key: string, defaultValue: string[] = []) => {
      const value = searchParams.get(key);
      if (!value) return defaultValue;
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  };
}