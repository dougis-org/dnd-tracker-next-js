import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterService } from '@/lib/services/CharacterService';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import {
  createMockCharacter,
  createMockStats,
  renderStatsManager,
  waitForElement,
  setupSuccessfulMocks,
  setupErrorMocks,
  enterEditMode,
  expectAbilityScoreDisplay,
  expectSavingThrowDisplay,
  expectSkillDisplay
} from './__tests__/CharacterStatsManager.test-helpers';

// Mock the CharacterService
jest.mock('@/lib/services/CharacterService', () => ({
  CharacterService: {
    getCharacterById: jest.fn(),
    calculateCharacterStats: jest.fn(),
    updateCharacter: jest.fn(),
    saveDraftChanges: jest.fn(),
    clearDraftChanges: jest.fn(),
    getDraftChanges: jest.fn(),
  }
}));

// Mock the CharacterServiceClient
jest.mock('@/lib/services/CharacterServiceClient', () => ({
  CharacterServiceClient: {
    getCharacterById: jest.fn(),
    updateCharacter: jest.fn(),
  }
}));

const mockCharacter = createMockCharacter();
const mockStats = createMockStats();

describe('CharacterStatsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSuccessfulMocks(mockCharacter, mockStats);
  });

  describe('Basic Rendering', () => {
    it('should render character stats manager component', async () => {
      renderStatsManager();
      await waitForElement('character-stats-manager');
    });

    it('should display loading state initially', () => {
      renderStatsManager();
      expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
    });

    it('should display character name when loaded', async () => {
      renderStatsManager();
      await waitForElement('character-stats-manager');
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });
  });

  describe('Ability Scores Display', () => {
    const abilityScoreTests = [
      { ability: 'strength', score: 16, modifier: 3 },
      { ability: 'dexterity', score: 14, modifier: 2 },
      { ability: 'constitution', score: 15, modifier: 2 },
      { ability: 'intelligence', score: 10, modifier: 0 },
      { ability: 'wisdom', score: 12, modifier: 1 },
      { ability: 'charisma', score: 8, modifier: -1 }
    ];

    it('should display all six ability scores', async () => {
      renderStatsManager();

      for (const { ability } of abilityScoreTests) {
        await waitForElement(`ability-${ability}`);
      }
    });

    it.each(abilityScoreTests)('should display $ability score with correct values',
      async ({ ability, score, modifier }) => {
        renderStatsManager();
        await expectAbilityScoreDisplay(ability, score, modifier);
      }
    );

    it('should allow editing ability scores when in edit mode', async () => {
      const user = userEvent.setup();
      renderStatsManager();

      await enterEditMode(user);

      const strengthInput = screen.getByTestId('ability-strength-input');
      expect(strengthInput).toBeInTheDocument();
      expect(strengthInput).toHaveValue(16);
    });
  });

  describe('Derived Stats Display', () => {
    it('should display armor class, initiative, and hit points', async () => {
      renderStatsManager();

      await waitForElement('armor-class');
      expect(screen.getByTestId('armor-class')).toHaveTextContent('16');
      expect(screen.getByTestId('initiative')).toHaveTextContent('+2');
      expect(screen.getByTestId('hit-points')).toHaveTextContent('12/12');
    });

    const savingThrowTests = [
      { ability: 'strength', bonus: 6, isProficient: true },
      { ability: 'dexterity', bonus: 2, isProficient: false },
      { ability: 'constitution', bonus: 5, isProficient: true },
      { ability: 'intelligence', bonus: 1, isProficient: false },
      { ability: 'wisdom', bonus: 1, isProficient: false },
      { ability: 'charisma', bonus: 0, isProficient: false }
    ];

    it.each(savingThrowTests)('should display $ability saving throw correctly',
      async ({ ability, bonus, isProficient }) => {
        renderStatsManager();
        await expectSavingThrowDisplay(ability, bonus, isProficient);
      }
    );

    const skillTests = [
      { skill: 'athletics', bonus: 6, isProficient: true },
      { skill: 'intimidation', bonus: 3, isProficient: true }
    ];

    it.each(skillTests)('should display $skill correctly',
      async ({ skill, bonus, isProficient }) => {
        renderStatsManager();
        await expectSkillDisplay(skill, bonus, isProficient);
      }
    );
  });

  describe('Equipment Management', () => {
    it('should display equipment list', async () => {
      renderStatsManager();

      await waitForElement('equipment-list');
      expect(screen.getByText('Chain Mail')).toBeInTheDocument();
    });

    it('should allow adding new equipment', async () => {
      const user = userEvent.setup();
      renderStatsManager();

      await waitForElement('equipment-list');
      const addButton = screen.getByTestId('add-equipment-button');
      await user.click(addButton);

      expect(screen.getByTestId('new-equipment-form')).toBeInTheDocument();
    });

    it('should calculate total equipment weight', async () => {
      renderStatsManager();

      await waitForElement('total-weight');
      expect(screen.getByTestId('total-weight')).toHaveTextContent('55 lbs');
    });
  });

  describe('Character Notes', () => {
    it('should display backstory and notes sections', async () => {
      renderStatsManager();

      await waitForElement('backstory-section');
      expect(screen.getByTestId('notes-section')).toBeInTheDocument();
      expect(screen.getByText('A brave warrior seeking adventure.')).toBeInTheDocument();
      expect(screen.getByText('Player prefers tactical combat.')).toBeInTheDocument();
    });

    it('should allow editing backstory and notes', async () => {
      const user = userEvent.setup();
      renderStatsManager();

      await waitForElement('backstory-section');
      const editButton = screen.getByTestId('edit-backstory-button');
      await user.click(editButton);

      const backstoryTextarea = screen.getByTestId('backstory-textarea');
      expect(backstoryTextarea).toBeInTheDocument();
      expect(backstoryTextarea).toHaveValue('A brave warrior seeking adventure.');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when character loading fails', async () => {
      setupErrorMocks('Character not found');
      renderStatsManager();

      await waitForElement('error-message');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Character not found');
    });

    it('should display error message when stats calculation fails', async () => {
      setupErrorMocks(undefined, 'Failed to calculate stats');
      renderStatsManager();

      await waitForElement('stats-error');
      expect(screen.getByTestId('stats-error')).toHaveTextContent('Failed to calculate stats');
    });
  });

  describe('Save Functionality', () => {
    it('should save changes when save button is clicked', async () => {
      const user = userEvent.setup();
      (CharacterServiceClient.updateCharacter as jest.Mock).mockResolvedValue({
        success: true,
        data: mockCharacter
      });

      renderStatsManager();
      await enterEditMode(user);

      const strengthInput = screen.getByTestId('ability-strength-input') as HTMLInputElement;
      expect(strengthInput).toHaveValue(16);

      fireEvent.change(strengthInput, { target: { value: '18' } });
      expect(strengthInput).toHaveValue(18);

      const saveButton = screen.getByTestId('save-stats-button');
      await user.click(saveButton);

      await waitForElement('character-stats-manager');
      expect(CharacterServiceClient.updateCharacter).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          abilityScores: expect.objectContaining({
            strength: 18
          })
        })
      );
    });

    it('should display save confirmation message', async () => {
      const user = userEvent.setup();
      (CharacterService.updateCharacter as jest.Mock).mockResolvedValue({
        success: true,
        data: mockCharacter
      });

      renderStatsManager();
      await enterEditMode(user);

      const saveButton = screen.getByTestId('save-stats-button');
      await user.click(saveButton);

      await waitForElement('save-success-message');
    });
  });
});