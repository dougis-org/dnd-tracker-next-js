import React from 'react';
import type { Character } from '@/lib/validations/character';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSavingThrowBonus, formatBonus } from './character-utils';

interface SavingThrowsDisplayProps {
  character: Character;
}

const SavingThrowItem = ({
  label,
  character,
  ability,
  score
}: {
  label: string;
  character: Character;
  ability: string;
  score: number;
}) => (
  <div className="flex justify-between">
    <span>{label}</span>
    <span className="font-medium">
      {formatBonus(getSavingThrowBonus(character, ability, score))}
    </span>
  </div>
);

export function SavingThrowsDisplay({ character }: SavingThrowsDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saving Throws</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <SavingThrowItem
            label="STR"
            character={character}
            ability="strength"
            score={character.abilityScores.strength}
          />
          <SavingThrowItem
            label="DEX"
            character={character}
            ability="dexterity"
            score={character.abilityScores.dexterity}
          />
          <SavingThrowItem
            label="CON"
            character={character}
            ability="constitution"
            score={character.abilityScores.constitution}
          />
          <SavingThrowItem
            label="INT"
            character={character}
            ability="intelligence"
            score={character.abilityScores.intelligence}
          />
          <SavingThrowItem
            label="WIS"
            character={character}
            ability="wisdom"
            score={character.abilityScores.wisdom}
          />
          <SavingThrowItem
            label="CHA"
            character={character}
            ability="charisma"
            score={character.abilityScores.charisma}
          />
        </div>
      </CardContent>
    </Card>
  );
}