/**
 * Tests for Issue #597: Prevent selection of characters without an ID in handleCharacterSelect
 *
 * This test file specifically addresses the bug where:
 * - Characters without _id can be incorrectly selected
 * - Multiple characters without _id get removed when one is clicked (due to undefined === undefined)
 * - Characters without _id should not be selectable since they cannot be imported
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

// Create character WITHOUT _id (simulates the bug scenario)
const createMockCharacterWithoutId = (overrides: Partial<Character> = {}): Character => {
  const character = createMockCharacterWithId(overrides);
  // Explicitly remove _id to simulate characters without IDs
  delete (character as any)._id;
  return character;
};

describe('CharacterLibraryInterface - Issue #597: Character Selection without ID', () => {
  const mockProps = {
    onImportCharacters: jest.fn(),
    isLoading: false,
    userId: 'user123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Characters without _id', () => {
    it('should NOT allow selection of characters without _id', async () => {
      // Setup characters: some with ID, some without
      const charactersWithMixedIds = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Character With ID',
        }),
        createMockCharacterWithoutId({
          name: 'Character Without ID 1',
        }),
        createMockCharacterWithoutId({
          name: 'Character Without ID 2',
        }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: charactersWithMixedIds,
          pagination: { page: 1, totalPages: 1, totalItems: 3, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText('Character With ID')).toBeInTheDocument();
        expect(screen.getByText('Character Without ID 1')).toBeInTheDocument();
        expect(screen.getByText('Character Without ID 2')).toBeInTheDocument();
      });

      // Try to click on the first character without ID
      const characterWithoutId1Checkbox = document.getElementById('character-Character Without ID 1');
      expect(characterWithoutId1Checkbox).toBeInTheDocument();
      await user.click(characterWithoutId1Checkbox!);

      // Should not be selected (checkbox should remain unchecked)
      await waitFor(() => {
        expect(characterWithoutId1Checkbox).not.toBeChecked();
      });

      // Selection count should remain 0
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });

    it('should allow selection of characters with valid _id', async () => {
      // Setup characters: some with ID, some without
      const charactersWithMixedIds = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Character With ID',
        }),
        createMockCharacterWithoutId({
          name: 'Character Without ID 1',
        }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: charactersWithMixedIds,
          pagination: { page: 1, totalPages: 1, totalItems: 2, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText('Character With ID')).toBeInTheDocument();
      });

      // Click on character with valid ID
      const characterWithIdCheckbox = document.getElementById('character-507f1f77bcf86cd799439011');
      expect(characterWithIdCheckbox).toBeInTheDocument();
      await user.click(characterWithIdCheckbox!);

      // Should be selected
      await waitFor(() => {
        expect(characterWithIdCheckbox).toBeChecked();
      });

      // Selection count should be 1
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should not incorrectly remove multiple characters without _id when one is clicked', async () => {
      // This tests the specific bug: clicking one character without ID removes ALL characters without ID
      const charactersWithoutIds = [
        createMockCharacterWithoutId({ name: 'Character 1 No ID' }),
        createMockCharacterWithoutId({ name: 'Character 2 No ID' }),
        createMockCharacterWithoutId({ name: 'Character 3 No ID' }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: charactersWithoutIds,
          pagination: { page: 1, totalPages: 1, totalItems: 3, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText('Character 1 No ID')).toBeInTheDocument();
        expect(screen.getByText('Character 2 No ID')).toBeInTheDocument();
        expect(screen.getByText('Character 3 No ID')).toBeInTheDocument();
      });

      // Before the fix: clicking any character without ID would select/deselect ALL characters without ID
      // After the fix: nothing should happen (no selection allowed)

      const character1Checkbox = document.getElementById('character-Character 1 No ID');
      expect(character1Checkbox).toBeInTheDocument();
      await user.click(character1Checkbox!);

      // None of the checkboxes should be checked
      await waitFor(() => {
        expect(character1Checkbox).not.toBeChecked();
        expect(document.getElementById('character-Character 2 No ID')).not.toBeChecked();
        expect(document.getElementById('character-Character 3 No ID')).not.toBeChecked();
      });

      // Selection count should remain 0
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });

    it('should handle mixed scenario: some characters with ID, some without', async () => {
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

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText('Valid Character 1')).toBeInTheDocument();
        expect(screen.getByText('Invalid Character 1')).toBeInTheDocument();
      });

      // Try to select all characters
      const validChar1Checkbox = document.getElementById('character-507f1f77bcf86cd799439011');
      const invalidChar1Checkbox = document.getElementById('character-Invalid Character 1');
      const validChar2Checkbox = document.getElementById('character-507f1f77bcf86cd799439012');
      const invalidChar2Checkbox = document.getElementById('character-Invalid Character 2');

      // Click on all characters
      await user.click(validChar1Checkbox!);
      await user.click(invalidChar1Checkbox!);
      await user.click(validChar2Checkbox!);
      await user.click(invalidChar2Checkbox!);

      await waitFor(() => {
        // Only characters with valid IDs should be selected
        expect(validChar1Checkbox).toBeChecked();
        expect(validChar2Checkbox).toBeChecked();
        // Characters without IDs should NOT be selected
        expect(invalidChar1Checkbox).not.toBeChecked();
        expect(invalidChar2Checkbox).not.toBeChecked();
      });

      // Selection count should be 2 (only valid characters)
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should not break import functionality when characters without ID are present', async () => {
      const mixedCharacters = [
        createMockCharacterWithId({
          _id: '507f1f77bcf86cd799439011',
          name: 'Valid Character',
        }),
        createMockCharacterWithoutId({ name: 'Invalid Character' }),
      ];

      mockCharacterService.getCharactersByOwner = jest.fn().mockResolvedValue({
        success: true,
        data: {
          items: mixedCharacters,
          pagination: { page: 1, totalPages: 1, totalItems: 2, itemsPerPage: 20 },
        },
      });

      const user = userEvent.setup();
      render(<CharacterLibraryInterface {...mockProps} />);

      // Wait for characters to load
      await waitFor(() => {
        expect(screen.getByText('Valid Character')).toBeInTheDocument();
      });

      // Select the valid character
      const validCharacterCheckbox = document.getElementById('character-507f1f77bcf86cd799439011');
      await user.click(validCharacterCheckbox!);

      await waitFor(() => {
        expect(validCharacterCheckbox).toBeChecked();
        expect(screen.getByText('Import Selected (1)')).toBeInTheDocument();
      });

      // Import should work normally
      const importButton = screen.getByRole('button', { name: /import selected/i });
      expect(importButton).toBeEnabled();
      await user.click(importButton);

      // Should only import the valid character
      expect(mockProps.onImportCharacters).toHaveBeenCalledWith([mixedCharacters[0]]);
    });
  });
});