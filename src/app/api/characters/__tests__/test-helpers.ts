import { NextRequest } from 'next/server';
import { CharacterType } from '@/lib/validations/character';
import { expectSuccessResponse, expectErrorResponse, createMockParams as createMockParamsBase } from '@/lib/test-utils/shared-api-test-helpers';

export { expectSuccessResponse, expectErrorResponse };

export const TEST_USER_ID = '507f1f77bcf86cd799439011';
export const TEST_CHARACTER_ID = '507f1f77bcf86cd799439012';

export const createMockParams = (id: string = TEST_CHARACTER_ID) =>
  createMockParamsBase(id);

export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) => {
  const headers = new Headers(options.headers || {});

  const mockRequest = {
    json: jest.fn().mockResolvedValue(options.body || {}),
    method: options.method || 'GET',
    headers,
    url,
  };

  // Mock URL constructor for parsing search params
  Object.defineProperty(mockRequest, 'url', {
    value: url,
    writable: false,
  });

  return mockRequest as unknown as NextRequest;
};

export const createTestCharacter = (overrides: Partial<any> = {}) => ({
  _id: TEST_CHARACTER_ID,
  name: 'Test Character',
  owner: TEST_USER_ID,
  type: 'pc' as CharacterType,
  race: 'human',
  level: 1,
  classes: [{ class: 'fighter', level: 1, hitDie: 10 }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  },
  hitPoints: { maximum: 11, current: 11, temporary: 0 },
  armorClass: 16,
  speed: 30,
  proficiencyBonus: 2,
  ...overrides,
});

export const createCharacterData = (overrides: Partial<any> = {}) => ({
  name: 'New Character',
  type: 'pc' as CharacterType,
  race: 'dwarf',
  classes: [{ class: 'cleric', level: 2, hitDie: 8 }],
  abilityScores: {
    strength: 14,
    dexterity: 10,
    constitution: 16,
    intelligence: 12,
    wisdom: 16,
    charisma: 8,
  },
  hitPoints: { maximum: 18, current: 18, temporary: 0 },
  armorClass: 18,
  speed: 25,
  proficiencyBonus: 2,
  savingThrows: {
    strength: false,
    dexterity: false,
    constitution: true,
    intelligence: false,
    wisdom: true,
    charisma: false,
  },
  ...overrides,
});

// expectSuccessResponse and expectErrorResponse now imported from shared-api-test-helpers