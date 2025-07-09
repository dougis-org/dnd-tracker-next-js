import { NextRequest } from 'next/server';
import { CharacterService } from '@/lib/services/CharacterService';
import {
  initializeRoute,
  handleSimpleResult,
  handleRouteError,
  validateCharacterUpdate
} from '../helpers/route-helpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await initializeRoute(request);
    if (error) return error;

    const { id } = await context.params;
    const result = await CharacterService.getCharacterById(id, userId!);
    return handleSimpleResult(result);
  } catch (error) {
    return handleRouteError(error, 'GET /api/characters/[id]');
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await initializeRoute(request);
    if (error) return error;

    const { id } = await context.params;
    const body = await request.json();
    const validation = validateCharacterUpdate(body);
    if (!validation.isValid) return validation.error!;

    const result = await CharacterService.updateCharacter(id, userId!, validation.data!);
    return handleSimpleResult(result, 'Character updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/characters/[id]');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await initializeRoute(request);
    if (error) return error;

    const { id } = await context.params;
    const result = await CharacterService.deleteCharacter(id, userId!);
    return handleSimpleResult(result, 'Character deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/characters/[id]');
  }
}