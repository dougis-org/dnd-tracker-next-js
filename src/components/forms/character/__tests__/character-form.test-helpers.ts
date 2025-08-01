import { CharacterClass, CharacterRace, CharacterType } from '@/lib/validations/character';
import {
  createTestCharacterWithEnhancedAbilities,
  createMulticlassTestCharacter as createMulticlassTestCharacterBase,
  createHighLevelTestCharacter as createHighLevelTestCharacterBase,
  createInvalidTestCharacter as createInvalidTestCharacterBase
} from '../constants';
import { containsTextIgnoreCase } from '../../../../test-utils/secure-regexp';

export interface TestCharacterData {
  name: string;
  type: CharacterType;
  race: CharacterRace | 'custom';
  customRace?: string;
  classes: Array<{
    className: CharacterClass;
    level: number;
  }>;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hitPoints: {
    maximum: number;
    current: number;
    temporary?: number;
  };
  armorClass: number;
  speed?: number;
  proficiencyBonus?: number;
  backstory?: string;
  notes?: string;
}

// Use consolidated test factories to reduce duplication
export const createValidTestCharacter = (overrides: Partial<TestCharacterData> = {}): TestCharacterData =>
  createTestCharacterWithEnhancedAbilities({
    armorClass: 14, // Override default from constants
    ...overrides,
  }) as TestCharacterData;

export const createMulticlassTestCharacter = (): TestCharacterData =>
  createMulticlassTestCharacterBase() as TestCharacterData;

export const createCustomRaceTestCharacter = (): TestCharacterData => createValidTestCharacter({
  name: 'Custom Race Character',
  race: 'custom',
  customRace: 'Dragonborn Variant',
});

export const createNPCTestCharacter = (): TestCharacterData => createValidTestCharacter({
  name: 'Goblin Warrior',
  type: 'npc',
  race: 'goblin',
  classes: [{ className: 'barbarian', level: 2 }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 8,
    wisdom: 10,
    charisma: 8,
  },
  hitPoints: {
    maximum: 18,
    current: 18,
  },
  armorClass: 13,
});

export const createHighLevelTestCharacter = (): TestCharacterData =>
  createHighLevelTestCharacterBase() as TestCharacterData;

export const createInvalidTestCharacter = (): Partial<TestCharacterData> =>
  createInvalidTestCharacterBase() as Partial<TestCharacterData>;

export interface FormTestHelpers {
  fillBasicInfo: (_character: TestCharacterData) => Promise<void>;
  fillAbilityScores: (_scores: TestCharacterData['abilityScores']) => Promise<void>;
  fillClasses: (_classes: TestCharacterData['classes']) => Promise<void>;
  fillCombatStats: (_hitPoints: TestCharacterData['hitPoints'], _armorClass: number) => Promise<void>;
  submitForm: () => Promise<void>;
  expectValidationError: (_fieldName: string, _errorMessage: string) => void;
}

export const createFormTestHelpers = (
  screen: any,
  userEvent: any
): FormTestHelpers => ({
  async fillBasicInfo(_character: TestCharacterData) {
    const nameField = screen.getByLabelText(/character name/i);
    await userEvent.clear(nameField);
    await userEvent.type(nameField, _character.name);

    const typeField = screen.getByLabelText(/character type/i);
    await userEvent.selectOptions(typeField, _character.type);

    const raceField = screen.getByLabelText(/race/i);
    await userEvent.click(raceField);
    if (_character.race === 'custom' && _character.customRace) {
      await userEvent.click(screen.getByText('Custom'));
      const customRaceField = screen.getByLabelText(/custom race name/i);
      await userEvent.type(customRaceField, _character.customRace);
    } else {
      const raceOption = screen.getByText((content) => containsTextIgnoreCase(content, _character.race as string));
      await userEvent.click(raceOption);
    }
  },

  async fillAbilityScores(_scores: TestCharacterData['abilityScores']) {
    const abilities = [
      { name: 'Strength', value: _scores.strength },
      { name: 'Dexterity', value: _scores.dexterity },
      { name: 'Constitution', value: _scores.constitution },
      { name: 'Intelligence', value: _scores.intelligence },
      { name: 'Wisdom', value: _scores.wisdom },
      { name: 'Charisma', value: _scores.charisma },
    ];

    for (const ability of abilities) {
      const field = screen.getByLabelText((content) => containsTextIgnoreCase(content, ability.name));
      await userEvent.clear(field);
      await userEvent.type(field, ability.value.toString());
    }
  },

  async fillClasses(_classes: TestCharacterData['classes']) {
    // Fill first class (always present)
    if (_classes.length > 0) {
      const classField = screen.getAllByLabelText(/character class/i)[0];
      await userEvent.click(classField);
      await userEvent.click(screen.getByText((content) => containsTextIgnoreCase(content, _classes[0].className)));

      const levelField = screen.getAllByLabelText(/level/i)[0];
      await userEvent.clear(levelField);
      await userEvent.type(levelField, _classes[0].level.toString());
    }

    // Add additional classes
    for (let i = 1; i < _classes.length; i++) {
      const addClassButton = screen.getByRole('button', { name: /add class/i });
      await userEvent.click(addClassButton);

      const classField = screen.getAllByLabelText(/character class/i)[i];
      await userEvent.click(classField);
      await userEvent.click(screen.getByText((content) => containsTextIgnoreCase(content, _classes[i].className)));

      const levelField = screen.getAllByLabelText(/level/i)[i];
      await userEvent.clear(levelField);
      await userEvent.type(levelField, _classes[i].level.toString());
    }
  },

  async fillCombatStats(_hitPoints: TestCharacterData['hitPoints'], _armorClass: number) {
    const maxHpField = screen.getByLabelText(/maximum hit points/i);
    await userEvent.clear(maxHpField);
    await userEvent.type(maxHpField, _hitPoints.maximum.toString());

    const currentHpField = screen.getByLabelText(/current hit points/i);
    await userEvent.clear(currentHpField);
    await userEvent.type(currentHpField, _hitPoints.current.toString());

    if (_hitPoints.temporary) {
      const tempHpField = screen.getByLabelText(/temporary hit points/i);
      await userEvent.clear(tempHpField);
      await userEvent.type(tempHpField, _hitPoints.temporary.toString());
    }

    const acField = screen.getByLabelText(/armor class/i);
    await userEvent.clear(acField);
    await userEvent.type(acField, _armorClass.toString());
  },

  async submitForm() {
    const submitButton = screen.getByRole('button', { name: /create character/i });
    await userEvent.click(submitButton);
  },

  expectValidationError(_fieldName: string, _errorMessage: string) {
    const errorElement = screen.getByText((content) => containsTextIgnoreCase(content, _errorMessage));
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute('role', 'alert');
  },
});

export const mockCharacterServiceResponses = {
  success: (characterData: any) => ({
    success: true,
    data: {
      id: 'char123',
      ...characterData,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }),

  validationError: (message: string, details?: string) => ({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details,
    },
  }),

  permissionError: (message: string) => ({
    success: false,
    error: {
      code: 'PERMISSION_DENIED',
      message,
    },
  }),

  databaseError: (message: string) => ({
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message,
    },
  }),
};

export const expectFormToBeInLoadingState = (screen: any) => {
  expect(screen.getByText(/creating character/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create character/i })).toBeDisabled();
};

export const expectFormToShowError = (screen: any, errorMessage: string) => {
  expect(screen.getByText((content) => containsTextIgnoreCase(content, errorMessage))).toBeInTheDocument();
};

export const expectCharacterPreviewToShow = (screen: any, character: TestCharacterData) => {
  expect(screen.getByText('Character Preview')).toBeInTheDocument();
  expect(screen.getByText(character.name)).toBeInTheDocument();
  expect(screen.getByText((content) => containsTextIgnoreCase(content, character.race as string))).toBeInTheDocument();

  // Check ability scores in preview
  Object.entries(character.abilityScores).forEach(([_ability, score]) => {
    expect(screen.getByText(score.toString())).toBeInTheDocument();
  });
};