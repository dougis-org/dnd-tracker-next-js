import { NextRequest } from 'next/server';
import { CharacterService } from '@/lib/services/CharacterService';
import {
  parseQueryParams
} from './helpers/api-helpers';
import {
  handleSimpleResult,
  handleCreationResult,
  handlePaginatedResult,
  validateCharacterCreation
} from './helpers/route-helpers';
import { withAuth } from '@/lib/api/session-route-helpers';

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const { type, search, limit, page } = parseQueryParams(request.url);

    if (search) {
      const result = await CharacterService.searchCharacters(search, userId);
      return handleSimpleResult(result);
    }
    if (type) {
      const result = await CharacterService.getCharactersByType(type as any, userId);
      return handleSimpleResult(result);
    }

    const result = await CharacterService.getCharactersByOwner(userId, page, limit);
    return handlePaginatedResult(result);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json();
    const validation = validateCharacterCreation(body);
    if (!validation.isValid) return validation.error!;

    const result = await CharacterService.createCharacter(userId, validation.data!);
    return handleCreationResult(result, 'Character created successfully');
  });
}