import { NextRequest, NextResponse } from 'next/server';
import { EncounterService } from '@/lib/services/EncounterService';
import { encounterSettingsPartialSchema } from '@/lib/validations/encounter';
import { objectIdSchema } from '@/lib/validations/base';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';

async function validateAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false as const,
      error: NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { success: true as const, userId: session.user.id };
}

async function validateEncounterAccess(encounterId: string, userId: string) {
  const existingResult = await EncounterService.getEncounterById(encounterId);
  if (!existingResult.success) {
    return {
      success: false as const,
      error: createErrorResponse(
        existingResult.error?.message || 'Encounter not found',
        formatErrorDetails(existingResult.error?.details),
        existingResult.error?.statusCode || 404
      ),
    };
  }

  if (existingResult.data?.ownerId.toString() !== userId) {
    return {
      success: false as const,
      error: createErrorResponse(
        'Insufficient permissions',
        ['You do not have permission to modify this encounter'],
        403
      ),
    };
  }

  return { success: true as const, data: existingResult.data };
}

function createErrorResponse(message: string, errors: string[], status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

function createSuccessResponse(settings: any) {
  return NextResponse.json(
    {
      success: true,
      message: 'Encounter settings updated successfully',
      settings,
    },
    { status: 200 }
  );
}

async function validateEncounterId(params: Promise<{ id: string }>) {
  const resolvedParams = await params;
  const validation = objectIdSchema.safeParse(resolvedParams.id);

  if (!validation.success) {
    return {
      success: false as const,
      error: createErrorResponse(
        'Validation error',
        ['Invalid encounter ID format'],
        400
      ),
    };
  }

  return { success: true as const, data: validation.data };
}

async function validateRequestBody(request: NextRequest) {
  const body = await request.json();
  const validation = encounterSettingsPartialSchema.safeParse(body);

  if (!validation.success) {
    const zodError = validation.error as ZodError;
    const errors = zodError.errors.map((error) =>
      `${error.path.join('.')}: ${error.message}`
    );

    return {
      success: false as const,
      error: createErrorResponse('Validation error', errors, 400),
    };
  }

  return { success: true as const, data: validation.data };
}

function formatErrorDetails(details: any[] = []): string[] {
  return details.map(detail =>
    typeof detail === 'string' ? detail : `${detail.field}: ${detail.message}`
  );
}

async function updateEncounterSettings(encounterId: string, settings: any) {
  const result = await EncounterService.updateEncounter(encounterId, {
    settings,
  });

  if (!result.success) {
    return createErrorResponse(
      result.error?.message || 'Failed to update encounter settings',
      formatErrorDetails(result.error?.details),
      result.error?.statusCode || 500
    );
  }

  return createSuccessResponse(result.data?.settings);
}

function handleUnexpectedError(error: unknown) {
  console.error('Error updating encounter settings:', error);
  return NextResponse.json(
    {
      success: false,
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Validate authentication
    const authValidation = await validateAuth();
    if (!authValidation.success) {
      return authValidation.error;
    }

    // Validate encounter ID
    const idValidation = await validateEncounterId(context.params);
    if (!idValidation.success) {
      return idValidation.error;
    }

    // Validate user has access to the encounter
    const accessValidation = await validateEncounterAccess(idValidation.data, authValidation.userId);
    if (!accessValidation.success) {
      return accessValidation.error;
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    return await updateEncounterSettings(idValidation.data, bodyValidation.data);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}