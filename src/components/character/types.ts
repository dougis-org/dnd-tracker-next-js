import type { Character } from '@/lib/validations/character';

export interface CharacterActions {
  onCharacterEdit?: (_character: Character) => void;
  onCharacterDelete?: (_character: Character) => void;
  onCharacterDuplicate?: (_character: Character) => void;
  onCharacterSelect?: (_character: Character) => void;
}

export interface SelectionProps {
  selectedCharacters: Set<string>;
  onSelectCharacter: (_characterId: string, _selected: boolean) => void;
}

export interface CharacterDisplayProps extends CharacterActions, SelectionProps {
  characters: Character[];
}

export interface CharacterTableProps extends CharacterDisplayProps {
  onSelectAll: (_selected: boolean) => void;
}