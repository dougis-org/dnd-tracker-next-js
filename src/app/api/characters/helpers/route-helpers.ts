import { connectToDatabase } from '@/lib/db';
import { characterCreationSchema, characterUpdateSchema } from '@/lib/validations/character';
import {
  createErrorResponse,
  createSuccessResponse
} from './api-helpers';
import { auth } from '@/lib/auth';

/**
 * Common route initialization - handles DB connection and authentication
 */
export async function initializeRoute() {
  await connectToDatabase();

  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: createErrorResponse('Unauthorized', 401),
      userId: null
    };
  }

  return { error: null, userId: session.user.id };
}

/**
 * Handle service result for simple operations
 */
export function handleSimpleResult(
  result: { success: boolean; data?: any; error?: any },
  successMessage?: string
) {
  if (!result.success) {
    return createErrorResponse(result.error, 404);
  }
  return createSuccessResponse(result.data, successMessage);
}

/**
 * Handle service result for creation operations (returns 201)
 */
export function handleCreationResult(
  result: { success: boolean; data?: any; error?: any },
  successMessage?: string
) {
  if (!result.success) {
    return createErrorResponse(result.error, 400);
  }
  return createSuccessResponse(result.data, successMessage, undefined, 201);
}

/**
 * Handle service result for paginated operations
 */
export function handlePaginatedResult(
  result: { success: boolean; data?: any; error?: any }
) {
  if (!result.success) {
    return createErrorResponse(result.error, 404);
  }
  const paginatedData = result.data as any;
  return createSuccessResponse(paginatedData.items, undefined, paginatedData.pagination);
}

/**
 * Handle errors in API routes with consistent error responses
 */
export function handleRouteError(error: any, operation: string) {
  console.error(`${operation} error:`, error);

  if (!(error instanceof Error)) {
    return createErrorResponse('Internal server error', 500);
  }

  const message = error.message.toLowerCase();
  if (message.includes('not found')) {
    return createErrorResponse('Character not found', 404);
  }
  if (message.includes('access denied') || message.includes('forbidden')) {
    return createErrorResponse('Access denied', 403);
  }
  if (message.includes('validation')) {
    return createErrorResponse('Validation failed', 400);
  }

  return createErrorResponse('Internal server error', 500);
}

/**
 * Validate character creation data
 */
export function validateCharacterCreation(body: any) {
  const validation = characterCreationSchema.safeParse(body);
  if (!validation.success) {
    return {
      isValid: false,
      error: createErrorResponse('Validation failed', 400, validation.error.errors)
    };
  }
  return { isValid: true, data: validation.data };
}

/**
 * Validate character update data
 */
export function validateCharacterUpdate(body: any) {
  const validation = characterUpdateSchema.safeParse(body);
  if (!validation.success) {
    return {
      isValid: false,
      error: createErrorResponse('Validation failed', 400, validation.error.errors)
    };
  }
  return { isValid: true, data: validation.data };
}