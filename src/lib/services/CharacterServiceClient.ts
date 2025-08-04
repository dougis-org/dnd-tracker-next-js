/**
 * Client-side Character Service wrapper
 *
 * This service wraps the internal CharacterService and converts ICharacter
 * objects to client-safe Character validation types.
 */

import { CharacterService } from './CharacterService';
import type { Character } from '@/lib/validations/character';
import type { CharacterCreation, CharacterUpdate, CharacterSummary } from '@/lib/validations/character';
import type { ICharacter } from '@/lib/models/Character';
import type { ServiceResult } from './CharacterServiceErrors';

// Convert ICharacter to Character validation type
function convertICharacterToCharacter(iCharacter: ICharacter): Character {
  return {
    _id: iCharacter._id?.toString(),
    ownerId: iCharacter.ownerId.toString(),
    name: iCharacter.name,
    type: iCharacter.type,
    race: iCharacter.race as any,
    customRace: iCharacter.customRace,
    size: iCharacter.size,
    classes: iCharacter.classes.map(cls => ({
      class: cls.class as any,
      level: cls.level,
      hitDie: cls.hitDie,
      subclass: cls.subclass
    })),
    abilityScores: { ...iCharacter.abilityScores },
    hitPoints: { ...iCharacter.hitPoints },
    armorClass: iCharacter.armorClass,
    speed: iCharacter.speed,
    proficiencyBonus: iCharacter.proficiencyBonus,
    savingThrows: { ...iCharacter.savingThrows },
    skills: iCharacter.skills ? Object.fromEntries(iCharacter.skills.entries()) : {},
    equipment: iCharacter.equipment || [],
    spells: (iCharacter.spells || []).map(spell => ({
      ...spell,
      prepared: spell.isPrepared
    })),
    backstory: iCharacter.backstory,
    notes: iCharacter.notes,
    imageUrl: iCharacter.imageUrl,
    isPublic: iCharacter.isPublic,
    partyId: iCharacter.partyId?.toString(),
    createdAt: iCharacter.createdAt.toISOString(),
    updatedAt: iCharacter.updatedAt.toISOString()
  } as unknown as Character;
}

function convertICharactersToCharacters(iCharacters: ICharacter[]): Character[] {
  return iCharacters.map(convertICharacterToCharacter);
}

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
        data: convertICharacterToCharacter(result.data)
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
        data: convertICharacterToCharacter(result.data)
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
        data: convertICharacterToCharacter(result.data)
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
          items: convertICharactersToCharacters(result.data.items),
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
        data: convertICharactersToCharacters(result.data)
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
        data: convertICharactersToCharacters(result.data)
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
        data: convertICharactersToCharacters(result.data)
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
        data: convertICharactersToCharacters(result.data)
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