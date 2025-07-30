import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  validateAndGetEncounter,
  validateCombatActive,
  createSuccessResponse,
  createErrorResponse,
  handleAsyncError,
  validateRequiredFields,
  findParticipantInInitiative
} from './utils';
import type { IEncounter } from '@/lib/models/encounter/interfaces';

/**
 * Configuration for combat API endpoint
 */
export interface CombatApiConfig {
  operation: string;
  requireBody?: boolean;
  requiredFields?: string[];
  validatePaused?: boolean;
  validateNotPaused?: boolean;
  validateTurnHistory?: boolean;
  findParticipant?: boolean;
}

/**
 * Handler function type for combat operations
 */
export type CombatHandler = (
  _encounter: IEncounter,
  _body?: any,
  _participant?: any
) => Promise<boolean | NextResponse> | boolean | NextResponse;

/**
 * Data-driven validation pipeline for combat operations
 */
interface ValidationStep {
  name: string;
  validator: (_context: ValidationContext) => Promise<NextResponse | null> | NextResponse | null;
}

interface ValidationContext {
  config: CombatApiConfig;
  request: NextRequest;
  encounterId: string;
  userId?: string;
  body?: any;
  encounter?: IEncounter;
  participant?: any;
}

/**
 * Higher-order function that wraps combat API endpoints with common validation and error handling
 * Uses a data-driven validation pipeline to reduce complexity
 */
export function withCombatValidation(
  config: CombatApiConfig,
  handler: CombatHandler
) {
  return async function(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> {
    try {
      const { id: encounterId } = await context.params;
      const validationContext: ValidationContext = { config, request, encounterId };

      // Define validation pipeline - data-driven approach
      const validationSteps: ValidationStep[] = [
        { name: 'authentication', validator: validateAuthentication },
        { name: 'body', validator: validateAndParseBody },
        { name: 'encounter', validator: validateEncounterAccess },
        { name: 'combat', validator: validateCombatState },
        { name: 'additional', validator: performAdditionalValidations },
        { name: 'participant', validator: validateParticipant }
      ];

      // Execute validation pipeline
      for (const step of validationSteps) {
        const error = await step.validator(validationContext);
        if (error) return error;
      }

      // Execute handler and process result
      return await executeHandlerAndProcessResult(validationContext, handler);

    } catch (error) {
      return handleAsyncError(error, config.operation);
    }
  };
}

/**
 * Authentication validator
 */
async function validateAuthentication(context: ValidationContext): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }
  context.userId = session.user.id;
  return null;
}

/**
 * Body parsing and field validation
 */
async function validateAndParseBody(context: ValidationContext): Promise<NextResponse | null> {
  const { config, request } = context;

  if (config.requireBody || config.requiredFields || request.headers.get('content-length') !== '0') {
    try {
      context.body = await request.json();
    } catch (error) {
      if (!config.requireBody) {
        context.body = {};
      } else {
        throw error;
      }
    }

    if (config.requiredFields) {
      const fieldsError = validateRequiredFields(context.body, config.requiredFields);
      if (fieldsError) return fieldsError;
    }
  }
  return null;
}

/**
 * Encounter validation and ownership check
 */
async function validateEncounterAccess(context: ValidationContext): Promise<NextResponse | null> {
  const { encounter, errorResponse } = await validateAndGetEncounter(context.encounterId);
  if (errorResponse) return errorResponse;

  if (!encounter) {
    return NextResponse.json(
      { success: false, message: 'Encounter not found' },
      { status: 404 }
    );
  }

  if (encounter.ownerId.toString() !== context.userId) {
    return NextResponse.json(
      { success: false, message: 'Access denied: You do not own this encounter' },
      { status: 403 }
    );
  }

  context.encounter = encounter;
  return null;
}

/**
 * Combat state validation
 */
function validateCombatState(context: ValidationContext): NextResponse | null {
  if (!context.encounter) {
    return NextResponse.json(
      { success: false, message: 'Encounter not found' },
      { status: 404 }
    );
  }

  const combatError = validateCombatActive(context.encounter);
  if (combatError) return combatError;
  return null;
}

/**
 * Perform additional validations based on configuration
 */
function performAdditionalValidations(context: ValidationContext): NextResponse | null {
  const { encounter, config } = context;
  if (!encounter) return null; // Skip if no encounter

  const { combatState } = encounter;

  // Validate pause state
  if (config.validatePaused && !combatState.pausedAt) {
    return createValidationErrorResponse('Combat is not paused', 400);
  }
  if (config.validateNotPaused && combatState.pausedAt) {
    return createValidationErrorResponse('Combat is paused', 400);
  }

  // Validate turn history
  if (config.validateTurnHistory && combatState.currentTurn === 0 && combatState.currentRound === 1) {
    return createValidationErrorResponse('No previous turn available', 400);
  }

  return null;
}

/**
 * Participant validation
 */
function validateParticipant(context: ValidationContext): NextResponse | null {
  const { config, body, encounter } = context;

  if (config.findParticipant && body?.participantId && encounter) {
    context.participant = findParticipantInInitiative(encounter, body.participantId);
    if (!context.participant) {
      return createErrorResponse('Participant not found', 400);
    }
  }
  return null;
}

/**
 * Execute handler and process result
 */
async function executeHandlerAndProcessResult(
  context: ValidationContext,
  handler: CombatHandler
): Promise<NextResponse> {
  const { encounter, body, participant, config } = context;

  if (!encounter) {
    return NextResponse.json(
      { success: false, message: 'Encounter not found' },
      { status: 404 }
    );
  }

  const result = await handler(encounter, body, participant);

  // Handle different return types
  if (result instanceof Response) {
    return result as NextResponse;
  }

  if (typeof result === 'boolean' && !result) {
    return createErrorResponse(`Unable to ${config.operation}`, 400);
  }

  // Save and return success
  await encounter.save();
  return createSuccessResponse(encounter);
}

/**
 * Utility to create error response from validation
 */
function createValidationErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}