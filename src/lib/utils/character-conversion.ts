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
  return {
    _id: iCharacter._id?.toString(),
    ownerId: iCharacter.ownerId.toString(),
    name: iCharacter.name,
    type: iCharacter.type,
    race: iCharacter.race as any, // Type assertion needed due to validation schema enum
    customRace: iCharacter.customRace,
    size: iCharacter.size,
    classes: iCharacter.classes.map(cls => ({
      class: cls.class as any, // Type assertion needed due to validation schema enum
      level: cls.level,
      hitDie: cls.hitDie,
      subclass: cls.subclass
    })),
    abilityScores: {
      strength: iCharacter.abilityScores.strength,
      dexterity: iCharacter.abilityScores.dexterity,
      constitution: iCharacter.abilityScores.constitution,
      intelligence: iCharacter.abilityScores.intelligence,
      wisdom: iCharacter.abilityScores.wisdom,
      charisma: iCharacter.abilityScores.charisma
    },
    hitPoints: {
      maximum: iCharacter.hitPoints.maximum,
      current: iCharacter.hitPoints.current,
      temporary: iCharacter.hitPoints.temporary
    },
    armorClass: iCharacter.armorClass,
    speed: iCharacter.speed,
    proficiencyBonus: iCharacter.proficiencyBonus,
    savingThrows: {
      strength: iCharacter.savingThrows.strength,
      dexterity: iCharacter.savingThrows.dexterity,
      constitution: iCharacter.savingThrows.constitution,
      intelligence: iCharacter.savingThrows.intelligence,
      wisdom: iCharacter.savingThrows.wisdom,
      charisma: iCharacter.savingThrows.charisma
    },
    skills: iCharacter.skills ? Object.fromEntries(iCharacter.skills.entries()) : {},
    equipment: iCharacter.equipment.map(item => ({
      name: item.name,
      quantity: item.quantity,
      weight: item.weight,
      value: item.value,
      description: item.description,
      equipped: item.equipped,
      magical: item.magical
    })),
    spells: iCharacter.spells.map(spell => ({
      name: spell.name,
      level: spell.level,
      school: spell.school as any, // Type assertion needed due to validation schema enum
      castingTime: spell.castingTime,
      range: spell.range,
      components: {
        verbal: spell.components.includes('V'),
        somatic: spell.components.includes('S'),
        material: spell.components.includes('M'),
        materialComponent: spell.components.includes('M') ? spell.components : undefined
      },
      duration: spell.duration,
      description: spell.description,
      prepared: spell.isPrepared
    })),
    backstory: iCharacter.backstory,
    notes: iCharacter.notes,
    imageUrl: iCharacter.imageUrl,
    isPublic: iCharacter.isPublic,
    partyId: iCharacter.partyId?.toString(),
    createdAt: iCharacter.createdAt.toISOString(),
    updatedAt: iCharacter.updatedAt.toISOString()
  };
}

/**
 * Converts array of mongoose ICharacter to validation Character types
 */
export function convertICharactersToCharacters(iCharacters: ICharacter[]): Character[] {
  return iCharacters.map(convertICharacterToCharacter);
}