import { NextRequest, NextResponse } from 'next/server';
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
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.userId;
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
  } catch (error) {
    console.error('GET /api/characters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.userId;
    const body = await request.json();
    const validation = validateCharacterCreation(body);
    if (!validation.isValid) return validation.error!;

    const result = await CharacterService.createCharacter(userId, validation.data!);
    return handleCreationResult(result, 'Character created successfully');
  } catch (error) {
    console.error('POST /api/characters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}