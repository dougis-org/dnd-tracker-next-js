import type { ICharacter } from '@/lib/models/Character';
import { Types } from 'mongoose';
import { createMockCharacter } from '@/lib/services/__tests__/CharacterService.test-helpers';

const createCharacterWithClass = (
  id: string,
  name: string,
  level: number,
  race: string,
  characterClass: string,
  ac: number,
  dateOffset: number
): ICharacter => {
  const hp = level * 8 + 5; // Simplified HP calculation
  return createMockCharacter({
    _id: new Types.ObjectId(id) as any,
    name,
    level,
    race,
    classes: [{ class: characterClass, level, subclass: '', hitDie: 10 }],
    hitPoints: { current: hp, maximum: hp, temporary: 0 },
    armorClass: ac,
    createdAt: new Date(`2024-01-0${dateOffset}`),
  });
};

export const mockCharacters: ICharacter[] = [
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

  const filterElement = screen.getByRole('combobox', { name: new RegExp(filterSelector, 'i') });
  fireEvent.change(filterElement, { target: { value: filterValue } });

  await waitFor(() => {
    expectedVisible.forEach(name => expectCharacterToBeVisible(name));
    if (expectedHidden.length > 0) {
      expectCharactersNotToBeVisible(expectedHidden);
    }
  });
};