import { NextRequest } from 'next/server';
import { CharacterService } from '@/lib/services/CharacterService';
import {
  parseQueryParams
} from './helpers/api-helpers';
import {
  initializeRoute,
  handleSimpleResult,
  handleCreationResult,
  handlePaginatedResult,
  handleRouteError,
  validateCharacterCreation
} from './helpers/route-helpers';


export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await initializeRoute();
    if (error) return error;

    const { type, search, limit, page } = parseQueryParams(request.url);

    if (search) {
      const result = await CharacterService.searchCharacters(search, userId!);
      return handleSimpleResult(result);
    }
    if (type) {
      const result = await CharacterService.getCharactersByType(type as any, userId!);
      return handleSimpleResult(result);
    }

    const result = await CharacterService.getCharactersByOwner(userId!, page, limit);
    return handlePaginatedResult(result);
  } catch (error) {
    return handleRouteError(error, 'GET /api/characters');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, userId } = await initializeRoute();
    if (error) return error;

    const body = await request.json();
    const validation = validateCharacterCreation(body);
    if (!validation.isValid) return validation.error!;

    const result = await CharacterService.createCharacter(userId!, validation.data!);
    return handleCreationResult(result, 'Character created successfully');
  } catch (error) {
    return handleRouteError(error, 'POST /api/characters');
  }
}