// NextRequest type imported for withApiAuth/withBodyValidation compatibility
import { CharacterService } from '@/lib/services/CharacterService';
import { characterUpdateSchema } from '@/lib/validations/character';
import {
  withApiAuth,
  withBodyValidation,
  validateRouteParam,
  createSuccessResponse,
  handleApiError
} from '@/lib/api/auth-middleware';

export const GET = withApiAuth(async (authResult, request, context) => {
  try {
    const { userId } = authResult;
    const characterId = await validateRouteParam(context.params, 'id', 'Character ID is required');

    const result = await CharacterService.getCharacterById(characterId, userId);
    if (!result.success) throw new Error(result.error?.message || 'Operation failed');

    return createSuccessResponse(result.data);
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withBodyValidation(
  (body) => characterUpdateSchema.parse(body),
  async (authResult, validatedBody, request, context) => {
    try {
      const { userId } = authResult;
      const characterId = await validateRouteParam(context.params, 'id', 'Character ID is required');

      const result = await CharacterService.updateCharacter(characterId, userId, validatedBody);
      if (!result.success) throw new Error(result.error?.message || 'Operation failed');

      return createSuccessResponse(result.data, 'Character updated successfully');
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const DELETE = withApiAuth(async (authResult, request, context) => {
  try {
    const { userId } = authResult;
    const characterId = await validateRouteParam(context.params, 'id', 'Character ID is required');

    const result = await CharacterService.deleteCharacter(characterId, userId);
    if (!result.success) throw new Error(result.error?.message || 'Operation failed');

    return createSuccessResponse(result.data, 'Character deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
});