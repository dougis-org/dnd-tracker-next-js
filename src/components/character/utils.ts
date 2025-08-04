import type { Character } from '@/lib/validations/character';
import type { SortOption } from './constants';

/**
 * Utility functions for character list view
 */

const capitalizeFirst = (text: string): string => {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

export const formatCharacterClass = (character: Character): string => {
  const mainClass = character.classes[0];
  return `${capitalizeFirst(character.race)} ${capitalizeFirst(mainClass.class)}`;
};

export const formatHitPoints = (character: Character): string => {
  const { current, maximum, temporary } = character.hitPoints;
  return temporary > 0 ? `${current + temporary}/${maximum}` : `${current}/${maximum}`;
};

const compareByName = (a: Character, b: Character, ascending: boolean): number => {
  const result = a.name.localeCompare(b.name);
  return ascending ? result : -result;
};

const compareByLevel = (a: Character, b: Character, ascending: boolean): number => {
  const aLevel = a.classes.reduce((sum, cls) => sum + cls.level, 0);
  const bLevel = b.classes.reduce((sum, cls) => sum + cls.level, 0);
  const result = aLevel - bLevel;
  return ascending ? result : -result;
};

const compareByDate = (a: Character, b: Character, ascending: boolean): number => {
  const result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return ascending ? result : -result;
};

export const sortCharacters = (characters: Character[], sortBy: SortOption): Character[] => {
  return [...characters].sort((a: Character, b: Character) => {
    if (sortBy.startsWith('name')) return compareByName(a, b, sortBy === 'name-asc');
    if (sortBy.startsWith('level')) return compareByLevel(a, b, sortBy === 'level-asc');
    if (sortBy.startsWith('date')) return compareByDate(a, b, sortBy === 'date-asc');
    return 0;
  });
};

const filterBySearch = (characters: Character[], searchTerm: string): Character[] => {
  if (!searchTerm) return characters;
  return characters.filter((char: Character) =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

const filterByClass = (characters: Character[], classFilter: string): Character[] => {
  if (!classFilter) return characters;
  return characters.filter((char: Character) =>
    char.classes.some((cls: any) => cls.class === classFilter)
  );
};

const filterByRace = (characters: Character[], raceFilter: string): Character[] => {
  if (!raceFilter) return characters;
  return characters.filter((char: Character) => char.race === raceFilter);
};

export const filterCharacters = (
  characters: Character[],
  searchTerm: string,
  classFilter: string,
  raceFilter: string
): Character[] => {
  let filtered = filterBySearch(characters, searchTerm);
  filtered = filterByClass(filtered, classFilter);
  return filterByRace(filtered, raceFilter);
};