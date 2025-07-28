import { EncounterService } from '@/lib/services/EncounterService';
import { encounterSettingsPartialSchema } from '@/lib/validations/encounter';
import {
  withApiAuth,
  validateRouteParam,
  createSuccessResponse,
  handleApiError
} from '@/lib/api/auth-middleware';

export const PATCH = withApiAuth(async (authResult, request, context) => {
  try {
    const { userId: _userId } = authResult; // TODO: Add user ownership validation
    const encounterId = await validateRouteParam(context.params, 'id', 'Encounter ID is required');

    // Parse and validate request body
    const body = await request.json();
    const validatedSettings = encounterSettingsPartialSchema.parse(body);

    // Check if user owns the encounter and update settings
    const result = await EncounterService.updateEncounter(encounterId, {
      settings: validatedSettings,
    });

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update encounter settings');
    }

    return createSuccessResponse(
      { settings: result.data?.settings },
      'Encounter settings updated successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
});