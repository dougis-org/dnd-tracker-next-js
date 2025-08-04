/**
 * Test to verify that character components can import validation types
 * without causing runtime errors from mongoose dependencies
 *
 * This test addresses Issue #594: Client-side runtime error with mongoose imports
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Character } from '@/lib/validations/character';

// Import the fixed components to ensure they don't cause import errors
import { CharacterAbilityScores } from '../CharacterAbilityScores';
import { CharacterNotes } from '../CharacterNotes';
import { CharacterComparison } from '../CharacterComparison';
import { CharacterActionButtons } from '../CharacterActionButtons';

// Create a mock character using validation types (not mongoose types)
const createMockCharacter = (): Character => ({
  _id: '507f1f77bcf86cd799439011',
  ownerId: 'user123',
  name: 'Test Character',
  type: 'pc',
  race: 'human',
  size: 'medium',
  classes: [{
    class: 'fighter',
    level: 1,
    hitDie: 10
  }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8
  },
  hitPoints: {
    maximum: 12,
    current: 12,
    temporary: 0
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
    charisma: false
  },
  skills: {},
  equipment: [],
  spells: [],
  backstory: 'A brave fighter',
  notes: 'Test character for validation',
  isPublic: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('Client-side Component Import Validation', () => {
  const mockCharacter = createMockCharacter();

  it('should import CharacterActionButtons without mongoose dependencies', () => {
    // This test verifies that the component can be imported and instantiated
    // without causing "Cannot read properties of undefined (reading 'Character')" error
    expect(() => {
      render(
        <CharacterActionButtons
          character={mockCharacter}
          size="sm"
        />
      );
    }).not.toThrow();
  });

  it('should import CharacterAbilityScores without mongoose dependencies', () => {
    const mockEditedCharacter = {
      abilityScores: mockCharacter.abilityScores
    };

    expect(() => {
      render(
        <CharacterAbilityScores
          character={mockCharacter}
          editMode={false}
          editedCharacter={mockEditedCharacter}
          onUpdateAbilityScore={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  it('should import CharacterNotes without mongoose dependencies', () => {
    const mockEditedCharacter = {
      backstory: mockCharacter.backstory,
      notes: mockCharacter.notes
    };

    expect(() => {
      render(
        <CharacterNotes
          character={mockCharacter}
          editMode={false}
          editedCharacter={mockEditedCharacter}
          onUpdateBackstory={jest.fn()}
          onUpdateNotes={jest.fn()}
          onEnterEditMode={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  it('should import CharacterComparison without mongoose dependencies', () => {
    const updatedCharacter = {
      ...mockCharacter,
      name: 'Updated Character',
      abilityScores: {
        ...mockCharacter.abilityScores,
        strength: 18
      }
    };

    expect(() => {
      render(
        <CharacterComparison
          originalCharacter={mockCharacter}
          updatedCharacter={updatedCharacter}
          onAcceptChanges={jest.fn()}
          onRejectChanges={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  it('should validate that Character type from validations is properly structured', () => {
    // Verify the mock character conforms to the Character validation type
    expect(mockCharacter).toMatchObject({
      _id: expect.any(String),
      ownerId: expect.any(String),
      name: expect.any(String),
      type: expect.stringMatching(/^(pc|npc)$/),
      race: expect.any(String),
      classes: expect.arrayContaining([
        expect.objectContaining({
          class: expect.any(String),
          level: expect.any(Number),
          hitDie: expect.any(Number)
        })
      ]),
      abilityScores: expect.objectContaining({
        strength: expect.any(Number),
        dexterity: expect.any(Number),
        constitution: expect.any(Number),
        intelligence: expect.any(Number),
        wisdom: expect.any(Number),
        charisma: expect.any(Number)
      }),
      hitPoints: expect.objectContaining({
        maximum: expect.any(Number),
        current: expect.any(Number),
        temporary: expect.any(Number)
      }),
      armorClass: expect.any(Number)
    });
  });
});