import React, { useState } from 'react';
import type { Character } from '@/lib/validations/character';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CharacterOverview } from './detail-sections/CharacterOverview';
import { CharacterStats } from './detail-sections/CharacterStats';
import { CharacterEquipment } from './detail-sections/CharacterEquipment';
import { CharacterSpells } from './detail-sections/CharacterSpells';
import { CharacterNotes } from './detail-sections/CharacterNotes';

interface CharacterDetailViewProps {
  character: Character;
  onEdit: (_character: Character) => void;
  onShare: (_character: Character) => void;
}

export default function CharacterDetailView({ character, onEdit, onShare }: CharacterDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="spells">Spells</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CharacterOverview character={character} onEdit={onEdit} onShare={onShare} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <CharacterStats character={character} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <CharacterEquipment character={character} />
        </TabsContent>

        <TabsContent value="spells" className="mt-6">
          <CharacterSpells character={character} />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <CharacterNotes character={character} />
        </TabsContent>
      </Tabs>
    </div>
  );
}