import { NextRequest } from 'next/server';
// Service imports handled by shared utilities
import type { ImportOptions } from '@/lib/services/EncounterServiceImportExport';
import { withApiAuth } from '@/lib/api/auth-middleware';
import {
  importBodySchema,
  handleApiError,
  performImportOperation,
  processImportResult,
  createSuccessResponse,
  createErrorResponse,
} from '../shared-route-helpers';

export const POST = withApiAuth(async (authResult, request: NextRequest) => {
  try {
    const { userId } = authResult;
    const body = await request.json();
    const validatedBody = importBodySchema.parse(body);

    const options: ImportOptions = {
      ownerId: userId,
      ...validatedBody.options,
    };

    const result = await performImportOperation(validatedBody.data, validatedBody.format, options);
    const processedResult = processImportResult(result);

    if ('error' in processedResult) {
      return createErrorResponse(
        processedResult.error,
        400,
        processedResult.details
      );
    }

    return createSuccessResponse(processedResult);
  } catch (error) {
    return handleApiError(error);
  }
});

