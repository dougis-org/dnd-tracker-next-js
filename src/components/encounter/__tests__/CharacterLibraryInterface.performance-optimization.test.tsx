/**
 * Performance optimization tests for CharacterLibraryInterface
 *
 * Tests the optimization from PR review feedback addressing:
 * - Memoization of selectable characters to avoid repeated filtering
 * - Proper handling of checkbox state when no characters are selectable
 * - Disabled state for select-all when no selectable characters exist
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterLibraryInterface } from '../CharacterLibraryInterface';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import type { Character } from '@/lib/validations/character';

// Mock the CharacterServiceClient
jest.mock('@/lib/services/CharacterServiceClient');
const mockCharacterService = CharacterServiceClient as jest.Mocked<typeof CharacterServiceClient>;

// Mock scrollIntoView for tests
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Mock data factory for characters - matches Character validation type
const createMockCharacterWithId = (overrides: Partial<Character> = {}): Character => ({
  _id: '507f1f77bcf86cd799439011',
  ownerId: 'user123',
  name: 'Test Character',
  type: 'pc',
  race: 'human',
  customRace: undefined,
  size: 'medium',
  classes: [{ class: 'fighter', level: 5, hitDie: 10, subclass: undefined }],
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 12,
    wisdom: 13,
    charisma: 10,
  },
  hitPoints: {
    maximum: 45,
    current: 45,
    temporary: 0,
  },
  armorClass: 16,
  speed: 30,
  proficiencyBonus: 3,
  savingThrows: {
    strength: true,
    dexterity: false,
    constitution: true,
    intelligence: false,
    wisdom: false,
    charisma: false,
  },
  skills: {},
  equipment: [],
  spells: [],
  backstory: '',
  notes: '',
  imageUrl: undefined,
  isPublic: false,
  partyId: undefined,
  createdAt: '2025-08-04T05:19:01.210Z',
  updatedAt: '2025-08-04T05:19:01.210Z',
  ...overrides,
} as Character);

// Create character WITHOUT _id
const createMockCharacterWithoutId = (overrides: Partial<Character> = {}): Character => {
  const character = createMockCharacterWithId(overrides);
  // Explicitly remove _id to simulate characters without IDs
  delete (character as any)._id;
  return character;
};

describe('CharacterLibraryInterface - Performance Optimization', () => {
  const mockProps = {
    onImportCharacters: jest.fn(),
    isLoading: false,
    userId: 'user123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Memoized selectable characters calculation', () => {
    it('should properly count selectable characters (characters with _id)', async () => {
      const mixedCharacters = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Valid Character 1',
        }),
        createMockCharacterWithoutId({ name: 'Invalid Character 1' }),
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439012',
          name: 'Valid Character 2',
        }),
        createMockCharacterWithoutId({ name: 'Invalid Character 2' }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: mixedCharacters,
          pagination: { page: 1, totalPages: 1, totalItems: 4, itemsPerPage: 20 },
        },
      });

      render(<CharacterLibraryInterface {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Valid Character 1')).toBeInTheDocument();
      });

      // Should show count of only selectable characters (those with _id)
      expect(screen.getByText('Select all (2)')).toBeInTheDocument();
    });

    it('should disable select-all checkbox when no characters are selectable', async () => {
      const charactersWithoutIds = [
        createMockCharacterWithoutId({ name: 'Character 1 No ID' }),
        createMockCharacterWithoutId({ name: 'Character 2 No ID' }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: charactersWithoutIds,
          pagination: { page: 1, totalPages: 1, totalItems: 2, itemsPerPage: 20 },
        },
      });

      render(<CharacterLibraryInterface {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Character 1 No ID')).toBeInTheDocument();
      });

      // Should show 0 selectable characters and disable checkbox
      expect(screen.getByText('Select all (0)')).toBeInTheDocument();

      const selectAllCheckbox = document.getElementById('select-all');
      expect(selectAllCheckbox).toBeDisabled();
      expect(selectAllCheckbox).not.toBeChecked();
    });

    it('should handle edge case where selectedCharacters.length equals selectableCharactersCount of 0', async () => {
      const charactersWithoutIds = [
        createMockCharacterWithoutId({ name: 'Character 1 No ID' }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: charactersWithoutIds,
          pagination: { page: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 },
        },
      });

      render(<CharacterLibraryInterface {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Character 1 No ID')).toBeInTheDocument();
      });

      const selectAllCheckbox = document.getElementById('select-all');
      // Should not be checked even though 0 === 0, because we have the extra condition
      expect(selectAllCheckbox).not.toBeChecked();
      expect(selectAllCheckbox).toBeDisabled();
    });

    it('should properly handle select-all functionality with memoized values', async () => {
      const mixedCharacters = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Valid Character 1',
        }),
        createMockCharacterWithoutId({ name: 'Invalid Character' }),
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439012',
          name: 'Valid Character 2',
        }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: mixedCharacters,
          pagination: { page: 1, totalPages: 1, totalItems: 3, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Valid Character 1')).toBeInTheDocument();
      });

      // Should show 2 selectable characters
      expect(screen.getByText('Select all (2)')).toBeInTheDocument();

      const selectAllCheckbox = document.getElementById('select-all');
      expect(selectAllCheckbox).toBeEnabled();
      expect(selectAllCheckbox).not.toBeChecked();

      // Click select all
      await user.click(selectAllCheckbox!);

      await waitFor(() => {
        expect(selectAllCheckbox).toBeChecked();
        expect(screen.getByText('2 selected')).toBeInTheDocument();
      });

      // Verify only valid characters were selected
      const validChar1Checkbox = document.getElementById('character-507f1f77bcf86cd799439011');
      const validChar2Checkbox = document.getElementById('character-507f1f77bcf86cd799439012');
      const invalidCharCheckbox = document.getElementById('character-Invalid Character');

      expect(validChar1Checkbox).toBeChecked();
      expect(validChar2Checkbox).toBeChecked();
      expect(invalidCharCheckbox).not.toBeChecked();

      // Click select all again to deselect
      await user.click(selectAllCheckbox!);

      await waitFor(() => {
        expect(selectAllCheckbox).not.toBeChecked();
        expect(screen.getByText('0 selected')).toBeInTheDocument();
      });

      expect(validChar1Checkbox).not.toBeChecked();
      expect(validChar2Checkbox).not.toBeChecked();
    });

    it('should show correct state when all selectable characters are manually selected', async () => {
      const mixedCharacters = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Valid Character 1',
        }),
        createMockCharacterWithoutId({ name: 'Invalid Character' }),
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439012',
          name: 'Valid Character 2',
        }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: mixedCharacters,
          pagination: { page: 1, totalPages: 1, totalItems: 3, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Valid Character 1')).toBeInTheDocument();
      });

      // Manually select both valid characters
      const validChar1Checkbox = document.getElementById('character-507f1f77bcf86cd799439011');
      const validChar2Checkbox = document.getElementById('character-507f1f77bcf86cd799439012');

      await user.click(validChar1Checkbox!);
      await user.click(validChar2Checkbox!);

      await waitFor(() => {
        expect(screen.getByText('2 selected')).toBeInTheDocument();
      });

      // Select-all checkbox should now be checked since all selectable characters are selected
      const selectAllCheckbox = document.getElementById('select-all');
      expect(selectAllCheckbox).toBeChecked();
    });
  });
});