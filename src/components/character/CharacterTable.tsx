import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { CharacterActionButtons } from './CharacterActionButtons';
import { CharacterSelectionCheckbox } from './CharacterSelectionCheckbox';
import { formatHitPoints } from './utils';
import type { CharacterTableProps } from './types';

export function CharacterTable({
  characters,
  selectedCharacters,
  onCharacterSelect,
  onCharacterEdit,
  onCharacterDelete,
  onCharacterDuplicate,
  onSelectCharacter,
  onSelectAll,
}: CharacterTableProps) {
  return (
    <div className="border rounded-md">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-4 text-left">
              <Checkbox
                checked={selectedCharacters.size === characters.length}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
              />
            </th>
            <th className="p-4 text-left font-medium">Name</th>
            <th className="p-4 text-left font-medium">Level</th>
            <th className="p-4 text-left font-medium">Class</th>
            <th className="p-4 text-left font-medium">Race</th>
            <th className="p-4 text-left font-medium">AC</th>
            <th className="p-4 text-left font-medium">HP</th>
            <th className="p-4 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((character) => (
            <tr
              key={character._id?.toString() || character.name}
              className="border-b hover:bg-muted/50 cursor-pointer"
              data-testid={`character-row-${character._id?.toString() || character.name}`}
              onClick={() => onCharacterSelect?.(character)}
            >
              <td className="p-4">
                <CharacterSelectionCheckbox
                  characterId={character._id?.toString() || ''}
                  isSelected={selectedCharacters.has(character._id?.toString() || '')}
                  onSelectCharacter={onSelectCharacter}
                />
              </td>
              <td className="p-4 font-medium" data-testid="character-name">
                {character.name}
              </td>
              <td className="p-4" data-testid="character-level">
                Level {character.classes.reduce((sum, cls) => sum + cls.level, 0)}
              </td>
              <td className="p-4">{character.classes[0].class}</td>
              <td className="p-4">{character.race}</td>
              <td className="p-4">{character.armorClass}</td>
              <td className="p-4">{formatHitPoints(character)}</td>
              <td className="p-4">
                <CharacterActionButtons
                  character={character}
                  onEdit={onCharacterEdit}
                  onDuplicate={onCharacterDuplicate}
                  onDelete={onCharacterDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}