import type { Character } from '@/lib/validations/character';
import { containsTextIgnoreCase } from '../../../test-utils/secure-regexp';

const createCharacterWithClass = (
  id: string,
  name: string,
  level: number,
  race: string,
  characterClass: string,
  ac: number,
  dateOffset: number
): Character => {
  const hp = level * 8 + 5; // Simplified HP calculation
  return {
    _id: id,
    ownerId: 'user123',
    name,
    type: 'pc',
    race: race as any,
    size: 'medium',
    classes: [{ class: characterClass as any, level, hitDie: 10 }],
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 10,
      wisdom: 12,
      charisma: 8
    },
    hitPoints: { current: hp, maximum: hp, temporary: 0 },
    armorClass: ac,
    speed: 30,
    proficiencyBonus: 2,
    savingThrows: {
      strength: false,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false
    },
    skills: {},
    equipment: [],
    spells: [],
    backstory: `A brave ${characterClass}`,
    notes: 'Test character',
    isPublic: false,
    createdAt: `2024-01-0${dateOffset}T00:00:00.000Z`,
    updatedAt: `2024-01-0${dateOffset}T00:00:00.000Z`
  };
};

export const mockCharacters: Character[] = [
  createCharacterWithClass('char1', 'Aragorn', 5, 'human', 'ranger', 16, 1),
  createCharacterWithClass('char2', 'Legolas', 4, 'elf', 'ranger', 15, 5),
  createCharacterWithClass('char3', 'Gimli', 3, 'dwarf', 'fighter', 18, 3),
];

export const createMockPaginatedResponse = (items = mockCharacters, pagination = {}) => ({
  success: true as const,
  data: {
    items,
    pagination: {
      page: 1,
      limit: 12,
      total: items.length,
      totalPages: 1,
      ...pagination,
    },
  },
});

export const createMockErrorResponse = (message = 'Test error') => ({
  success: false as const,
  error: {
    type: 'DatabaseError',
    message,
    code: 'DB_ERROR',
  },
});

export const waitForCharacterToLoad = async (characterName = 'Aragorn') => {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(() => {
    expect(screen.getByText(characterName)).toBeInTheDocument();
  });
};

export const expectCharacterToBeVisible = (characterName: string) => {
  const { screen } = require('@testing-library/react');
  expect(screen.getByText(characterName)).toBeInTheDocument();
};

export const expectCharactersNotToBeVisible = (characterNames: string[]) => {
  const { screen } = require('@testing-library/react');
  characterNames.forEach(name => {
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  });
};

export const renderCharacterListAndWait = async (props: any) => {
  const { render } = await import('@testing-library/react');
  const React = await import('react');
  const { CharacterListView } = await import('../CharacterListView');

  render(React.createElement(CharacterListView, props));
  await waitForCharacterToLoad();
};

export const testFilterOperation = async (
  props: any,
  filterSelector: string,
  filterValue: string,
  expectedVisible: string[],
  expectedHidden: string[]
) => {
  const { screen, fireEvent, waitFor } = await import('@testing-library/react');

  await renderCharacterListAndWait(props);

  const filterElement = screen.getByRole('combobox', { name: (content) => containsTextIgnoreCase(content, filterSelector) });
  fireEvent.change(filterElement, { target: { value: filterValue } });

  await waitFor(() => {
    expectedVisible.forEach(name => expectCharacterToBeVisible(name));
    if (expectedHidden.length > 0) {
      expectCharactersNotToBeVisible(expectedHidden);
    }
  });
};