import React from 'react';
import type { Character } from '@/lib/validations/character';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAbilityScoreDisplay } from './character-utils';

interface AbilityScoresDisplayProps {
  character: Character;
}

const AbilityScoreItem = ({ label, score }: { label: string; score: number }) => (
  <div className="text-center">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className="text-lg font-bold">{getAbilityScoreDisplay(score)}</div>
  </div>
);

export function AbilityScoresDisplay({ character }: AbilityScoresDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ability Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <AbilityScoreItem label="STR" score={character.abilityScores.strength} />
          <AbilityScoreItem label="DEX" score={character.abilityScores.dexterity} />
          <AbilityScoreItem label="CON" score={character.abilityScores.constitution} />
          <AbilityScoreItem label="INT" score={character.abilityScores.intelligence} />
          <AbilityScoreItem label="WIS" score={character.abilityScores.wisdom} />
          <AbilityScoreItem label="CHA" score={character.abilityScores.charisma} />
        </div>
      </CardContent>
    </Card>
  );
}