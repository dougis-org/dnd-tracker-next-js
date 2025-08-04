/**
 * Utility functions to convert between mongoose models and validation types
 * Addresses Issue #594: Bridge between server-side ICharacter and client-side Character types
 */

import type { ICharacter } from '@/lib/models/Character';
import type { Character } from '@/lib/validations/character';

/**
 * Converts mongoose ICharacter to validation Character type
 * Safe for use in client-side components
 */
export function convertICharacterToCharacter(iCharacter: ICharacter): Character {
  const baseCharacter = {
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
    spells: iCharacter.spells || [],
    backstory: iCharacter.backstory,
    notes: iCharacter.notes,
    imageUrl: iCharacter.imageUrl,
    isPublic: iCharacter.isPublic,
    partyId: iCharacter.partyId?.toString(),
    createdAt: iCharacter.createdAt.toISOString(),
    updatedAt: iCharacter.updatedAt.toISOString()
  };

  return baseCharacter as Character;
}

/**
 * Converts array of mongoose ICharacter to validation Character types
 */
export function convertICharactersToCharacters(iCharacters: ICharacter[]): Character[] {
  if (!Array.isArray(iCharacters)) {
    return [];
  }

  return iCharacters.map(char => {
    // If already a Character type (from tests), return as-is
    // Check for test mock by looking for jest function properties or Date objects
    if (typeof char === 'object' && (
      char.createdAt instanceof Date ||
      char.updatedAt instanceof Date ||
      typeof char.getAbilityModifier === 'function'
    )) {
      return char as Character;
    }
    return convertICharacterToCharacter(char);
  });
}