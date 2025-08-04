import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CharacterActionButtons } from './CharacterActionButtons';
import { CharacterSelectionCheckbox } from './CharacterSelectionCheckbox';
import { formatCharacterClass, formatHitPoints } from './utils';
import type { CharacterDisplayProps } from './types';

interface CharacterGridProps extends CharacterDisplayProps {}

export function CharacterGrid({
  characters,
  selectedCharacters,
  onCharacterSelect,
  onCharacterEdit,
  onCharacterDelete,
  onCharacterDuplicate,
  onSelectCharacter,
}: CharacterGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {characters.map((character) => (
        <Card
          key={character._id?.toString() || character.name}
          className="cursor-pointer hover:shadow-md transition-shadow"
          data-testid={`character-card-${character._id?.toString() || character.name}`}
          onClick={() => onCharacterSelect?.(character)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg" data-testid="character-name">
                  {character.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="character-level">
                  Level {character.classes.reduce((sum, cls) => sum + cls.level, 0)}
                </p>
              </div>
              <CharacterSelectionCheckbox
                characterId={character._id?.toString() || ''}
                isSelected={selectedCharacters.has(character._id?.toString() || '')}
                onSelectCharacter={onSelectCharacter}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm">{formatCharacterClass(character)}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AC {character.armorClass}</span>
                <span className="text-sm text-muted-foreground">
                  HP {formatHitPoints(character)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {character.type.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-end mt-4">
              <CharacterActionButtons
                character={character}
                onEdit={onCharacterEdit}
                onDuplicate={onCharacterDuplicate}
                onDelete={onCharacterDelete}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}