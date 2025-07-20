/**
 * Test helpers for CharacterService tests to eliminate code duplication
 * Provides reusable mock data, test utilities, and assertion helpers
 */

import { ServiceResult } from '../CharacterServiceErrors';
import type {
  CharacterCreation,
  CharacterUpdate,
  CharacterSummary,
  CharacterPreset,
} from '../../validations/character';
import type { ICharacter } from '../../models/Character';

// Mock Character model
export const mockCharacterModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findByOwnerId: jest.fn(),
  findByType: jest.fn(),
  findPublic: jest.fn(),
  searchByName: jest.fn(),
  findByClass: jest.fn(),
  findByRace: jest.fn(),
};

// Mock setup helper
export const setupMockClearance = () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    Object.values(mockCharacterModel).forEach(mock => mock.mockReset());
  });
};

// ================================
// Mock Data Factories
// ================================

export const createMockCharacterData = (overrides: Partial<CharacterCreation> = {}): CharacterCreation => ({
  name: 'Test Character',
  type: 'pc',
  race: 'human',
  size: 'medium',
  classes: [{
    class: 'fighter',
    level: 1,
    hitDie: 10,
  }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  },
  hitPoints: {
    maximum: 12,
    current: 12,
    temporary: 0,
  },
  armorClass: 16,
  speed: 30,
  proficiencyBonus: 2,
  savingThrows: {
    strength: true,
    dexterity: false,
    constitution: true,
    intelligence: false,
    wisdom: false,
    charisma: false,
  },
  skills: {
    athletics: true,
    intimidation: true,
  },
  equipment: [{
    name: 'Chain Mail',
    quantity: 1,
    weight: 55,
    value: 75,
    equipped: true,
    magical: false,
  }],
  spells: [],
  backstory: 'A brave warrior seeking adventure.',
  notes: 'Player prefers tactical combat.',
  ...overrides,
});

export const createMockCharacterCreation = (overrides: Partial<CharacterCreation> = {}): CharacterCreation => ({
  name: 'Test Character',
  type: 'pc',
  race: 'human',
  size: 'medium',
  classes: [{
    class: 'fighter',
    level: 1,
    hitDie: 10,
  }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  },
  hitPoints: {
    maximum: 12,
    current: 12,
    temporary: 0,
  },
  armorClass: 16,
  speed: 30,
  proficiencyBonus: 2,
  savingThrows: {
    strength: true,
    dexterity: false,
    constitution: true,
    intelligence: false,
    wisdom: false,
    charisma: false,
  },
  skills: {
    athletics: true,
    intimidation: true,
  },
  equipment: [{
    name: 'Chain Mail',
    quantity: 1,
    weight: 55,
    value: 75,
    equipped: true,
    magical: false,
  }],
  spells: [],
  backstory: 'A brave warrior seeking adventure.',
  notes: 'Player prefers tactical combat.',
  ...overrides,
});

export const createMockCharacterUpdate = (overrides: Partial<CharacterUpdate> = {}): CharacterUpdate => ({
  name: 'Updated Character',
  hitPoints: {
    maximum: 15,
    current: 10,
    temporary: 5,
  },
  ...overrides,
});

export const createMockCharacter = (overrides: Partial<ICharacter> = {}): ICharacter => {
  const baseCharacter = createMockCharacterCreation();
  return {
    ...baseCharacter,
    _id: '507f1f77bcf86cd799439011' as any,
    ownerId: '507f1f77bcf86cd799439012' as any,
    isPublic: false,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    level: 1,
    getAbilityModifier: jest.fn((ability) => Math.floor((baseCharacter.abilityScores[ability] - 10) / 2)),
    getInitiativeModifier: jest.fn(() => 2),
    getEffectiveHP: jest.fn(() => baseCharacter.hitPoints.current + baseCharacter.hitPoints.temporary),
    isAlive: jest.fn(() => baseCharacter.hitPoints.current > 0),
    isUnconscious: jest.fn(() => baseCharacter.hitPoints.current <= 0),
    takeDamage: jest.fn(),
    heal: jest.fn(),
    addTemporaryHP: jest.fn(),
    toSummary: jest.fn(),
    save: jest.fn(),
    ...overrides,
  } as unknown as ICharacter;
};

export const createMockCharacterSummary = (overrides: Partial<CharacterSummary> = {}): CharacterSummary => ({
  _id: '507f1f77bcf86cd799439011' as any,
  name: 'Test Character',
  race: 'human',
  type: 'pc',
  level: 1,
  classes: [{
    class: 'fighter',
    level: 1,
    hitDie: 10,
  }],
  hitPoints: {
    maximum: 12,
    current: 12,
  },
  armorClass: 16,
  ownerId: '507f1f77bcf86cd799439012' as any,
  ...overrides,
});

export const createMockCharacterPreset = (overrides: Partial<CharacterPreset> = {}): CharacterPreset => ({
  name: 'Fighter Preset',
  type: 'pc',
  race: 'human',
  class: 'fighter',
  level: 1,
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  },
  hitPoints: 12,
  armorClass: 16,
  ...overrides,
});

// ================================
// Test Utilities
// ================================

export const createValidObjectId = (): string => {
  // Generate a valid 24-character hex string that looks like an ObjectId
  return '507f1f77bcf86cd799439011';
};

export const createInvalidObjectId = (): string => {
  return 'invalid-object-id';
};

// ================================
// ServiceResult Assertion Helpers
// ================================

export const expectSuccess = <T>(result: ServiceResult<T>): T => {
  expect(result.success).toBe(true);
  if (result.success) {
    return result.data;
  }
  throw new Error('Expected success but got error');
};

export const expectError = <T>(result: ServiceResult<T>, expectedCode?: string): string => {
  expect(result.success).toBe(false);
  if (!result.success) {
    if (expectedCode) {
      expect(result.error.code).toBe(expectedCode);
    }
    return result.error.code;
  }
  throw new Error('Expected error but got success');
};

// ================================
// Mock Database Helpers
// ================================

export const createMockCharacterArray = (count: number): ICharacter[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCharacter({
      _id: `507f1f77bcf86cd79943901${index.toString().padStart(1, '0')}` as any,
      name: `Character ${index + 1}`,
    })
  );
};

export const createMockSearch = (term: string) => ({
  byName: createMockCharacterArray(3).map(char => ({
    ...char,
    name: `${term} Character`,
  })),
  byClass: createMockCharacterArray(2),
  byRace: createMockCharacterArray(2),
});

// ================================
// Character-specific Test Data
// ================================

export const multiclassCharacterData: CharacterCreation = {
  ...createMockCharacterCreation(),
  name: 'Multiclass Character',
  classes: [
    { class: 'fighter', level: 3, hitDie: 10 },
    { class: 'wizard', level: 2, hitDie: 6 },
  ],
};

export const npcCharacterData: CharacterCreation = {
  ...createMockCharacterCreation(),
  name: 'Test NPC',
  type: 'npc',
  race: 'orc',
  classes: [{ class: 'barbarian', level: 5, hitDie: 12 }],
  hitPoints: { maximum: 58, current: 58, temporary: 0 },
  armorClass: 13,
};

export const invalidCharacterData = {
  name: '', // Invalid: empty name
  type: 'invalid' as any, // Invalid: not pc or npc
  race: 'invalid-race' as any,
  classes: [], // Invalid: no classes
  abilityScores: {
    strength: 0, // Invalid: below minimum
    dexterity: 31, // Invalid: above maximum
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  hitPoints: {
    maximum: -1, // Invalid: negative
    current: 0,
    temporary: -5, // Invalid: negative
  },
  armorClass: 0, // Invalid: below minimum
};