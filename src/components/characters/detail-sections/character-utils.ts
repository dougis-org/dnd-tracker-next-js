import type { Character } from '@/lib/validations/character';

// Define skill-to-ability mappings
export const SKILL_ABILITIES: Record<string, keyof Character['abilityScores']> = {
  'Athletics': 'strength',
  'Acrobatics': 'dexterity',
  'Sleight of Hand': 'dexterity',
  'Stealth': 'dexterity',
  'Arcana': 'intelligence',
  'History': 'intelligence',
  'Investigation': 'intelligence',
  'Nature': 'intelligence',
  'Religion': 'intelligence',
  'Animal Handling': 'wisdom',
  'Insight': 'wisdom',
  'Medicine': 'wisdom',
  'Perception': 'wisdom',
  'Survival': 'wisdom',
  'Deception': 'charisma',
  'Intimidation': 'charisma',
  'Performance': 'charisma',
  'Persuasion': 'charisma',
};

export const getAbilityModifier = (score: number): string => {
  const modifier = Math.floor((score - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

export const getAbilityScoreDisplay = (score: number): string => {
  return `${score} (${getAbilityModifier(score)})`;
};

// Generic helper for handling Map/Object data structures
const getProficiencyValue = (data: Map<string, boolean> | Record<string, boolean> | undefined, key: string): boolean => {
  if (!data) return false;
  return data instanceof Map ? data.get(key) || false : data[key] || false;
};

const isProficientInSavingThrow = (character: Character, ability: string): boolean => {
  return getProficiencyValue(character.savingThrows, ability);
};

export const getSavingThrowBonus = (character: Character, ability: string, score: number): number => {
  const modifier = Math.floor((score - 10) / 2);
  const isProficient = isProficientInSavingThrow(character, ability);
  return isProficient ? modifier + character.proficiencyBonus : modifier;
};

const isProficientInSkill = (character: Character, skillName: string): boolean => {
  return getProficiencyValue(character.skills, skillName);
};

export const getSkillBonus = (character: Character, skillName: string, abilityScore: number): number => {
  const modifier = Math.floor((abilityScore - 10) / 2);
  const isProficient = isProficientInSkill(character, skillName);
  return isProficient ? modifier + character.proficiencyBonus : modifier;
};

export const formatBonus = (bonus: number): string => {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
};

export const getOrdinalSuffix = (num: number): string => {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  // Handle special cases for 11th, 12th, 13th
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  // Handle regular cases
  const suffixes = ['th', 'st', 'nd', 'rd'];
  return suffixes[lastDigit] || 'th';
};

// Generic helper for extracting entries from Map/Object structures
const getDataEntries = (data: Map<string, any> | Record<string, any> | undefined): [string, any][] => {
  if (!data) return [];
  return data instanceof Map ? Array.from(data.entries()) : Object.entries(data);
};

// Generic helper for checking if Map/Object has any entries
const hasAnyEntries = (data: Map<string, any> | Record<string, any> | undefined): boolean => {
  if (!data) return false;
  return data instanceof Map ? data.size > 0 : Object.keys(data).length > 0;
};

// Utility for extracting skill entries from character
export const getSkillEntries = (character: Character) => {
  return getDataEntries(character.skills);
};

// Utility to check if character has any skills
export const hasAnySkills = (character: Character): boolean => {
  return hasAnyEntries(character.skills);
};