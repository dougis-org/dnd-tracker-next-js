import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Character } from '@/lib/validations/character';
import type { CharacterUpdate } from '@/lib/validations/character';

interface CharacterAbilityScoresProps {
  character: Character;
  editMode: boolean;
  editedCharacter: CharacterUpdate;
  onUpdateAbilityScore: (_ability: string, _value: number) => void;
}

export function CharacterAbilityScores({
  character,
  editMode,
  editedCharacter,
  onUpdateAbilityScore,
}: CharacterAbilityScoresProps) {
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ability Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {abilities.map((ability) => {
            const score = (editMode ? editedCharacter.abilityScores : character.abilityScores)?.[ability as keyof typeof character.abilityScores] || 10;
            const modifier = Math.floor((score - 10) / 2);
            const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;

            return (
              <div key={ability} data-testid={`ability-${ability}`} className="text-center p-4 border rounded">
                <div className="text-xs font-medium uppercase mb-1">
                  {ability.substring(0, 3)}
                </div>
                {editMode ? (
                  <Input
                    data-testid={`ability-${ability}-input`}
                    type="number"
                    min="1"
                    max="30"
                    value={score}
                    onChange={(e) => {
                      const numValue = parseInt(e.target.value, 10);
                      if (!isNaN(numValue)) {
                        onUpdateAbilityScore(ability, numValue);
                      }
                    }}
                    className="text-center text-2xl font-bold h-12 mb-1"
                  />
                ) : (
                  <div className="text-2xl font-bold mb-1">{score}</div>
                )}
                <div className="text-sm text-muted-foreground">{modifierString}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}