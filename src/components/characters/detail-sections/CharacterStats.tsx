import React from 'react';
import type { Character } from '@/lib/validations/character';
import { AbilityScoresDisplay } from './AbilityScoresDisplay';
import { SavingThrowsDisplay } from './SavingThrowsDisplay';
import { SkillsDisplay } from './SkillsDisplay';

interface CharacterStatsProps {
  character: Character;
}

export function CharacterStats({ character }: CharacterStatsProps) {
  return (
    <div className="space-y-6">
      <AbilityScoresDisplay character={character} />
      <SavingThrowsDisplay character={character} />
      <SkillsDisplay character={character} />
    </div>
  );
}