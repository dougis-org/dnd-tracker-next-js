import React from 'react';
import type { Character } from '@/lib/validations/character';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSkillBonus, formatBonus, SKILL_ABILITIES, getSkillEntries, hasAnySkills } from './character-utils';

interface SkillsDisplayProps {
  character: Character;
}

const SkillItem = ({ skillName, character }: { skillName: string; character: Character }) => {
  const abilityKey = SKILL_ABILITIES[skillName] || 'wisdom';
  const abilityScore = character.abilityScores[abilityKey];
  const bonus = getSkillBonus(character, skillName, abilityScore);

  return (
    <div className="flex justify-between">
      <span>{skillName}</span>
      <span className="font-medium">{formatBonus(bonus)}</span>
    </div>
  );
};

export function SkillsDisplay({ character }: SkillsDisplayProps) {
  if (!hasAnySkills(character)) return null;

  const skillEntries = getSkillEntries(character);
  const proficientSkills = skillEntries.filter(([, isProficient]) => isProficient);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {proficientSkills.map(([skillName]) => (
            <SkillItem key={skillName} skillName={skillName} character={character} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}