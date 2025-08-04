import { useState } from 'react';
import type { Character } from '@/lib/validations/character';

interface UseCharacterSelectionResult {
  selectedCharacters: Set<string>;
  handleSelectCharacter: (_characterId: string, _selected: boolean) => void;
  handleSelectAll: (_characters: Character[], _selected: boolean) => void;
  clearSelection: () => void;
}

export function useCharacterSelection(): UseCharacterSelectionResult {
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());

  const handleSelectCharacter = (characterId: string, selected: boolean) => {
    const newSelected = new Set(selectedCharacters);
    if (selected) {
      newSelected.add(characterId);
    } else {
      newSelected.delete(characterId);
    }
    setSelectedCharacters(newSelected);
  };

  const handleSelectAll = (characters: Character[], selected: boolean) => {
    if (selected) {
      setSelectedCharacters(new Set(characters.map(char => char._id?.toString() || '').filter(id => id)));
    } else {
      setSelectedCharacters(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedCharacters(new Set());
  };

  return {
    selectedCharacters,
    handleSelectCharacter,
    handleSelectAll,
    clearSelection,
  };
}