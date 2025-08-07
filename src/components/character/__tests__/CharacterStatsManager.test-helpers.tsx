import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CharacterStatsManager } from '../CharacterStatsManager';
import { CharacterService } from '@/lib/services/CharacterService';
import { createMockCharacter as createMockCharacterBase } from '@/lib/services/__tests__/CharacterService.test-helpers';

// Convert service layer mock (with object skills) to component layer format
export const createMockCharacter = (overrides = {}) => {
  const baseMock = createMockCharacterBase(overrides);
  return {
    ...baseMock,
    // Keep skills as object for CharacterStatsManager component
    skills: baseMock.skills || {},
  };
};

// Specialized character factory for stats testing (kept for specific use case)
export const createMockCharacterForStats = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Character',
  type: 'pc' as const,
  race: 'human',
  size: 'medium' as const,
  classes: [
    { class: 'fighter', level: 5, subclass: 'Champion', hitDie: 10 }
  ],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 12,
    wisdom: 13,
    charisma: 10
  },
  hitPoints: {
    maximum: 47,
    current: 47,
    temporary: 0
  },
  armorClass: 18,
  speed: 30,
  proficiencyBonus: 3,
  savingThrows: {
    strength: true,
    dexterity: false,
    constitution: true,
    intelligence: false,
    wisdom: false,
    charisma: false
  },
  skills: {
    athletics: true,
    intimidation: true,
    perception: false
  },
  equipment: [
    {
      name: 'Longsword',
      quantity: 1,
      weight: 3,
      value: 15,
      equipped: true,
      magical: false
    }
  ],
  backstory: 'A brave warrior',
  notes: 'Remember to track rations',
  isPublic: false,
  ownerId: '507f1f77bcf86cd799439012',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock stats data factory
export const createMockStats = (overrides = {}) => ({
  abilityModifiers: {
    strength: 3,
    dexterity: 2,
    constitution: 2,
    intelligence: 1,
    wisdom: 1,
    charisma: 0
  },
  savingThrows: {
    strength: 6,
    dexterity: 2,
    constitution: 5,
    intelligence: 1,
    wisdom: 1,
    charisma: 0
  },
  skills: {
    athletics: 6,
    intimidation: 3,
    perception: 1
  },
  totalLevel: 5,
  classLevels: { fighter: 5 },
  proficiencyBonus: 3,
  initiativeModifier: 2,
  armorClass: 18,
  effectiveHitPoints: 47,
  status: 'alive' as const,
  isAlive: true,
  isUnconscious: false,
  ...overrides
});

// Helper to render the CharacterStatsManager with default props
export const renderStatsManager = (
  characterId = '507f1f77bcf86cd799439011',
  userId = '507f1f77bcf86cd799439012'
) => {
  return render(<CharacterStatsManager characterId={characterId} userId={userId} />);
};

// Helper to wait for an element to be present
export const waitForElement = async (testId: string) => {
  await waitFor(() => {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
};

// Helper to setup successful service mocks
export const setupSuccessfulMocks = (mockCharacter?: any, mockStats?: any) => {
  (CharacterService.getCharacterById as jest.Mock).mockResolvedValue({
    success: true,
    data: mockCharacter || createMockCharacter()
  });
  (CharacterService.calculateCharacterStats as jest.Mock).mockResolvedValue({
    success: true,
    data: mockStats || createMockStats()
  });
};

// Helper to setup error mocks
export const setupErrorMocks = (characterError?: string, statsError?: string) => {
  if (characterError) {
    (CharacterService.getCharacterById as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: characterError, code: 'ERROR' }
    });
  }

  if (statsError) {
    (CharacterService.calculateCharacterStats as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: statsError, code: 'CALCULATION_ERROR' }
    });
  }
};

// Helper to enter edit mode
export const enterEditMode = async (user: any) => {
  await waitForElement('edit-stats-button');
  const editButton = screen.getByTestId('edit-stats-button');
  await user.click(editButton);
};

// Helper to verify ability score display
export const expectAbilityScoreDisplay = async (ability: string, score: number, modifier: number) => {
  await waitFor(() => {
    const abilityElement = screen.getByTestId(`ability-${ability}`);
    expect(abilityElement).toHaveTextContent(score.toString());
    expect(abilityElement).toHaveTextContent(modifier >= 0 ? `+${modifier}` : `${modifier}`);
  });
};

// Helper to verify saving throw display
export const expectSavingThrowDisplay = async (ability: string, bonus: number, isProficient: boolean) => {
  await waitFor(() => {
    const savingThrowElement = screen.getByTestId(`saving-throw-${ability}`);
    expect(savingThrowElement).toHaveTextContent(bonus >= 0 ? `+${bonus}` : `${bonus}`);
    if (isProficient) {
      expect(savingThrowElement).toHaveClass('proficient');
    } else {
      expect(savingThrowElement).not.toHaveClass('proficient');
    }
  });
};

// Helper to verify skill display
export const expectSkillDisplay = async (skill: string, bonus: number, isProficient: boolean) => {
  await waitFor(() => {
    const skillElement = screen.getByTestId(`skill-${skill}`);
    expect(skillElement).toHaveTextContent(bonus >= 0 ? `+${bonus}` : `${bonus}`);
    if (isProficient) {
      expect(skillElement).toHaveClass('proficient');
    } else {
      expect(skillElement).not.toHaveClass('proficient');
    }
  });
};