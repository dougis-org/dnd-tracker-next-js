/**
 * Custom error classes and error handling utilities for PartyService
 */

// Service response types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    statusCode: number;
    details?: Array<{ field: string; message: string }>;
  };
}

// Custom error classes for better error handling
export class PartyServiceError extends Error {
  public code: string;

  public statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'PartyServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PartyNotFoundError extends PartyServiceError {
  constructor(identifier: string) {
    super(`Party not found: ${identifier}`, 'PARTY_NOT_FOUND', 404);
  }
}

export class PartyAccessDeniedError extends PartyServiceError {
  constructor(_partyId: string, _userId: string) {
    super(
      'You do not have permission to access this party',
      'PARTY_ACCESS_DENIED',
      403
    );
  }
}

export class PartyCapacityExceededError extends PartyServiceError {
  constructor(maxMembers: number) {
    super(
      `Party is at maximum capacity (${maxMembers} members)`,
      'PARTY_CAPACITY_EXCEEDED',
      400
    );
  }
}

export class PartyValidationError extends PartyServiceError {
  constructor(field: string, message: string) {
    super(`Invalid ${field}: ${message}`, 'PARTY_VALIDATION_ERROR', 400);
  }
}

export class PartyOwnershipError extends PartyServiceError {
  constructor(action: string) {
    super(
      `You must be the party owner to ${action}`,
      'PARTY_OWNERSHIP_REQUIRED',
      403
    );
  }
}

export class PartyMemberNotFoundError extends PartyServiceError {
  constructor(characterId: string, partyId: string) {
    super(
      `Character ${characterId} is not a member of party ${partyId}`,
      'PARTY_MEMBER_NOT_FOUND',
      404
    );
  }
}

/**
 * Handle errors and convert them to ServiceResult error format
 */
export function handleServiceError(
  error: unknown,
  defaultMessage: string,
  defaultCode: string,
  defaultStatusCode: number = 500
): ServiceResult<never> {
  if (error instanceof PartyServiceError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
    };
  }

  // Handle validation errors
  if (error instanceof Error && error.message.includes('validation')) {
    return {
      success: false,
      error: {
        message: 'Invalid party data provided',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      },
    };
  }

  // Handle MongoDB duplicate key errors
  if (
    error instanceof Error &&
    'code' in error &&
    (error as any).code === 11000
  ) {
    const field = error.message.includes('name') ? 'name' : 'field';
    return {
      success: false,
      error: {
        message: `Party with this ${field} already exists`,
        code: 'PARTY_ALREADY_EXISTS',
        statusCode: 409,
      },
    };
  }

  // Handle cast errors (invalid ObjectId)
  if (error instanceof Error && error.name === 'CastError') {
    return {
      success: false,
      error: {
        message: 'Invalid party ID format',
        code: 'INVALID_PARTY_ID',
        statusCode: 400,
      },
    };
  }

  return {
    success: false,
    error: {
      message: defaultMessage,
      code: defaultCode,
      statusCode: defaultStatusCode,
    },
  };
}