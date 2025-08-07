import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterService } from '@/lib/services/CharacterService';
import { createMockCharacter } from '@/lib/services/__tests__/CharacterService.test-helpers';

const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

// Base character configuration
const BASE_CHARACTER_CONFIG = {
  name: 'Test Character',
  race: 'human',
  type: 'pc' as const,
  classes: [{ class: 'fighter', level: 5, hitDie: 10 }],
};

// Common test setup
export const setupUserEvent = () => userEvent.setup();

// Character builders - centralized
export const createBasicTestCharacter = (overrides = {}) =>
  createMockCharacter({
    ...BASE_CHARACTER_CONFIG,
    ...overrides,
  });

export const createCharacterWithStats = () =>
  createBasicTestCharacter({
    hitPoints: { maximum: 45, current: 35, temporary: 0 },
    armorClass: 15,
    speed: 30,
  });

export const createCharacterWithAbilityScores = () =>
  createBasicTestCharacter({
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  });

export const createMulticlassCharacter = () =>
  createBasicTestCharacter({
    classes: [
      { class: 'Fighter', level: 3, subclass: 'Battle Master', hitDie: 10 },
      { class: 'Rogue', level: 2, subclass: 'Arcane Trickster', hitDie: 8 },
    ],
  });

export const createCharacterWithNotes = () =>
  createBasicTestCharacter({
    notes: 'This is a test character with some notes.',
  });

export const createCharacterWithBackstory = () =>
  createBasicTestCharacter({
    backstory: 'Born in a small village, this character has a rich history.',
  });

// Service mocking utilities - centralized
export const mockCharacterLoad = (character: any) => {
  mockCharacterService.getCharacterById.mockResolvedValue({
    success: true,
    data: character,
  });
};

export const mockCharacterNotFound = () => {
  mockCharacterService.getCharacterById.mockResolvedValue({
    success: false,
    error: { message: 'Character not found', code: 'NOT_FOUND' },
  });
};

export const mockCharacterLoadPending = () => {
  mockCharacterService.getCharacterById.mockReturnValue(new Promise(() => {}));
};

// Wait utilities - centralized
export const waitForCharacterLoad = async (characterName = 'Test Character') => {
  await waitFor(() => {
    expect(screen.getByText(characterName)).toBeInTheDocument();
  });
};

export const waitForText = async (text: string, timeout = 3000) => {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument();
  }, { timeout });
};

export const waitForMultipleTexts = async (texts: string[], timeout = 3000) => {
  await waitFor(() => {
    texts.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  }, { timeout });
};

// Tab interaction utilities - centralized
export const clickTab = async (user: ReturnType<typeof userEvent.setup>, tabName: string) => {
  const tab = screen.getByRole('tab', { name: tabName });
  await user.click(tab);
};

export const clickTabAndWait = async (
  user: ReturnType<typeof userEvent.setup>,
  tabName: string,
  expectedTexts: string[]
) => {
  await clickTab(user, tabName);
  await waitForMultipleTexts(expectedTexts);
};

// Text assertion utilities
export const expectTextToBeVisible = (text: string) => {
  expect(screen.getByText(text)).toBeInTheDocument();
};

export const expectTextsToBeVisible = (texts: string[]) => {
  texts.forEach(text => expectTextToBeVisible(text));
};