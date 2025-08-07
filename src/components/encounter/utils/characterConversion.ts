import type { Character } from '@/lib/validations/character';
import type { ParticipantFormData } from '../hooks/useParticipantForm';
import type { IParticipantReference } from '@/lib/models/encounter/interfaces';

/**
 * Converts a character document to participant form data
 * This utility handles the data transformation between character library and encounter participants
 */
export function convertCharacterToParticipant(character: Character): ParticipantFormData {
  return {
    name: character.name,
    type: character.type,
    maxHitPoints: character.hitPoints.maximum,
    currentHitPoints: character.hitPoints.current,
    temporaryHitPoints: character.hitPoints.temporary || 0,
    armorClass: character.armorClass,
    initiative: undefined, // Will be rolled during encounter
    isPlayer: character.type === 'pc',
    isVisible: true,
    notes: character.notes || '',
    conditions: [],
  };
}

/**
 * Converts a character to participant data with characterId for service operations
 */
export function convertCharacterToParticipantData(character: Character): Omit<IParticipantReference, 'characterId'> & { characterId: string } {
  if (!character._id) {
    throw new Error('Character must have an ID to be converted to participant data');
  }
  return {
    characterId: character._id.toString(),
    name: character.name,
    type: character.type,
    maxHitPoints: character.hitPoints.maximum,
    currentHitPoints: character.hitPoints.current,
    temporaryHitPoints: character.hitPoints.temporary || 0,
    armorClass: character.armorClass,
    initiative: undefined, // Will be rolled during encounter
    isPlayer: character.type === 'pc',
    isVisible: true,
    notes: character.notes || '',
    conditions: [],
    position: { x: 0, y: 0 }, // Default position
  };
}

/**
 * Converts multiple characters to participant form data
 */
export function convertCharactersToParticipants(characters: Character[]): ParticipantFormData[] {
  return characters.map(convertCharacterToParticipant);
}

/**
 * Converts multiple characters to participant data for service operations
 */
export function convertCharactersToParticipantData(characters: Character[]): Array<Omit<IParticipantReference, 'characterId'> & { characterId: string }> {
  return characters.map(convertCharacterToParticipantData);
}

/**
 * Validates basic character fields
 */
function validateBasicCharacterFields(character: Character): string[] {
  const errors: string[] = [];

  if (!character.name?.trim()) {
    errors.push('Character name is required');
  }

  if (!character.type) {
    errors.push('Character type is required');
  }

  if (!character.hitPoints?.maximum || character.hitPoints.maximum <= 0) {
    errors.push('Character must have valid hit points');
  }

  if (!character.armorClass || character.armorClass <= 0) {
    errors.push('Character must have valid armor class');
  }

  return errors;
}

/**
 * Validates character ability scores
 */
function validateCharacterAbilityScores(character: Character): string[] {
  const errors: string[] = [];

  if (!character.abilityScores) {
    errors.push('Character must have ability scores');
    return errors;
  }

  const requiredAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  for (const ability of requiredAbilities) {
    if (!character.abilityScores[ability as keyof typeof character.abilityScores] ||
        character.abilityScores[ability as keyof typeof character.abilityScores] <= 0) {
      errors.push(`Character must have valid ${ability} score`);
    }
  }

  return errors;
}

/**
 * Validates that a character can be converted to a participant
 */
export function validateCharacterForConversion(character: Character): { isValid: boolean; errors: string[] } {
  const errors: string[] = [
    ...validateBasicCharacterFields(character),
    ...validateCharacterAbilityScores(character),
  ];

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates multiple characters for conversion
 */
export function validateCharactersForConversion(characters: Character[]): {
  validCharacters: Character[];
  invalidCharacters: { character: Character; errors: string[] }[];
} {
  const validCharacters: Character[] = [];
  const invalidCharacters: { character: Character; errors: string[] }[] = [];

  for (const character of characters) {
    const validation = validateCharacterForConversion(character);
    if (validation.isValid) {
      validCharacters.push(character);
    } else {
      invalidCharacters.push({ character, errors: validation.errors });
    }
  }

  return { validCharacters, invalidCharacters };
}