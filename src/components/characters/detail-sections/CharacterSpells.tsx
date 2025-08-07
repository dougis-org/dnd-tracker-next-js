import React from 'react';
import type { Character } from '@/lib/validations/character';
import { Badge } from '@/components/ui/badge';
import { getOrdinalSuffix } from './character-utils';
import { SectionCard } from './components/SectionCard';

interface CharacterSpellsProps {
  character: Character;
}

const getSpellLevelTitle = (level: string): string => {
  return level === '0' ? 'Cantrips' : `${level}${getOrdinalSuffix(parseInt(level, 10))} Level`;
};

const SpellItem = ({ spell }: { spell: any }) => (
  <div className="flex items-start justify-between p-3 bg-muted rounded">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">{spell.name}</h4>
        <Badge variant={spell.isPrepared ? 'default' : 'secondary'}>
          {spell.isPrepared ? 'Prepared' : 'Known'}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {spell.school} • {spell.components} • {spell.duration}
      </div>
    </div>
  </div>
);

const SpellLevelGroup = ({ level, spells }: { level: string; spells: any[] }) => (
  <SectionCard title={getSpellLevelTitle(level)}>
    <div className="space-y-3">
      {spells.map((spell, index) => (
        <SpellItem key={index} spell={spell} />
      ))}
    </div>
  </SectionCard>
);

const groupSpellsByLevel = (spells: any[]) => {
  return spells.reduce((acc, spell) => {
    const level = spell.level;
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(spell);
    return acc;
  }, {} as Record<number, any[]>);
};

export function CharacterSpells({ character }: CharacterSpellsProps) {
  if (!character.spells || character.spells.length === 0) {
    return <p className="text-muted-foreground">No spells known.</p>;
  }

  const spellsByLevel = groupSpellsByLevel(character.spells);

  return (
    <div className="space-y-6">
      {Object.entries(spellsByLevel)
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([level, spells]) => (
          <SpellLevelGroup key={level} level={level} spells={spells as any[]} />
        ))}
    </div>
  );
}