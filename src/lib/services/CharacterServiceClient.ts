/**
 * Client-side Character Service wrapper
 *
 * This service wraps the internal CharacterService and converts ICharacter
 * objects to client-safe Character validation types.
 */

import { CharacterService } from './CharacterService';
import type { Character } from '@/lib/validations/character';
import type { CharacterCreation, CharacterUpdate, CharacterSummary } from '@/lib/validations/character';
import type { ServiceResult } from './CharacterServiceErrors';
import { toClientCharacter, toClientCharacters } from './utils/transformations';

// Note: This client should use API calls instead of direct service access.
// For now, we'll pass through data assuming the service layer handles conversion.

// Client-safe paginated characters type
interface ClientPaginatedCharacters {
  items: Character[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Client-side wrapper for CharacterService that returns Character validation types
 */
export class CharacterServiceClient {
  static async createCharacter(
    ownerId: string,
    characterData: CharacterCreation
  ): Promise<ServiceResult<Character>> {
    const result = await CharacterService.createCharacter(ownerId, characterData);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacter(result.data)
      };
    }
    return result;
  }

  static async getCharacterById(
    characterId: string,
    userId: string
  ): Promise<ServiceResult<Character>> {
    const result = await CharacterService.getCharacterById(characterId, userId);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacter(result.data)
      };
    }
    return result;
  }

  static async updateCharacter(
    characterId: string,
    userId: string,
    updateData: CharacterUpdate
  ): Promise<ServiceResult<Character>> {
    const result = await CharacterService.updateCharacter(characterId, userId, updateData);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacter(result.data)
      };
    }
    return result;
  }

  static async deleteCharacter(
    characterId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    return CharacterService.deleteCharacter(characterId, userId);
  }

  static async getCharactersByOwner(
    ownerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResult<ClientPaginatedCharacters>> {
    const result = await CharacterService.getCharactersByOwner(ownerId, page, limit);
    if (result.success) {
      return {
        success: true,
        data: {
          items: toClientCharacters(result.data.items),
          pagination: {
            page: result.data.pagination.page,
            totalPages: result.data.pagination.totalPages,
            totalItems: result.data.pagination.total,
            itemsPerPage: result.data.pagination.limit
          }
        }
      };
    }
    return result;
  }

  static async searchCharacters(
    searchTerm: string,
    userId: string
  ): Promise<ServiceResult<Character[]>> {
    const result = await CharacterService.searchCharacters(searchTerm, userId);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacters(result.data)
      };
    }
    return result;
  }

  static async getCharactersByClass(
    className: any,
    userId: string
  ): Promise<ServiceResult<Character[]>> {
    const result = await CharacterService.getCharactersByClass(className, userId);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacters(result.data)
      };
    }
    return result;
  }

  static async getCharactersByRace(
    race: any,
    userId: string
  ): Promise<ServiceResult<Character[]>> {
    const result = await CharacterService.getCharactersByRace(race, userId);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacters(result.data)
      };
    }
    return result;
  }

  static async getCharactersByType(
    type: any,
    userId: string
  ): Promise<ServiceResult<Character[]>> {
    const result = await CharacterService.getCharactersByType(type, userId);
    if (result.success) {
      return {
        success: true,
        data: toClientCharacters(result.data)
      };
    }
    return result;
  }

  static async getCharacterSummary(
    characterId: string,
    userId: string
  ): Promise<ServiceResult<CharacterSummary>> {
    return CharacterService.getCharacterSummary(characterId, userId);
  }
}