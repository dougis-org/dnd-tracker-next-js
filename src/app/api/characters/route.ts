// NextRequest type imported for withApiAuth/withBodyValidation compatibility
import { CharacterService } from '@/lib/services/CharacterService';
import { characterCreationSchema } from '@/lib/validations/character';
import {
  withApiAuth,
  withBodyValidation,
  parseQueryParams,
  createSuccessResponse,
  handleApiError
} from '@/lib/api/auth-middleware';

export const GET = withApiAuth(async (authResult, request) => {
  try {
    const { userId } = authResult;
    const queryParams = parseQueryParams(request);

    const search = queryParams.getString('search');
    const type = queryParams.getString('type');
    const limit = queryParams.getNumber('limit', 50);
    const page = queryParams.getNumber('page', 1);

    if (search) {
      const result = await CharacterService.searchCharacters(search, userId);
      if (!result.success) throw new Error(result.error?.message || 'Operation failed');
      return createSuccessResponse(result.data);
    }

    if (type) {
      const result = await CharacterService.getCharactersByType(type as any, userId);
      if (!result.success) throw new Error(result.error?.message || 'Operation failed');
      return createSuccessResponse(result.data);
    }

    const result = await CharacterService.getCharactersByOwner(userId, page, limit);
    if (!result.success) throw new Error(result.error?.message || 'Failed to get characters');

    return createSuccessResponse(
      result.data.items,
      undefined,
      result.data.pagination
    );
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withBodyValidation(
  (body) => characterCreationSchema.parse(body),
  async (authResult, validatedBody) => {
    try {
      const { userId } = authResult;
      const result = await CharacterService.createCharacter(userId, validatedBody);

      if (!result.success) throw new Error(result.error?.message || 'Operation failed');

      return createSuccessResponse(
        result.data,
        'Character created successfully',
        undefined,
        201
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);