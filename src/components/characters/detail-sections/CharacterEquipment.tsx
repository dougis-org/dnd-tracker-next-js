import React from 'react';
import type { Character } from '@/lib/validations/character';
import { SectionCard } from './components/SectionCard';
import { Badge } from '@/components/ui/badge';

interface CharacterEquipmentProps {
  character: Character;
}

interface EquipmentItemProps {
  item: any;
}

const EquipmentBadges = ({ item }: { item: any }) => (
  <div className="flex items-center gap-2">
    <Badge variant={item.equipped ? 'default' : 'secondary'}>
      {item.equipped ? 'Equipped' : 'Not Equipped'}
    </Badge>
    {item.magical && <Badge variant="outline">Magical</Badge>}
  </div>
);

const EquipmentDetails = ({ item }: { item: any }) => (
  <div className="text-right">
    <div className="font-medium">{item.value}</div>
    <div className="text-sm text-muted-foreground">{item.weight} lbs</div>
  </div>
);

const EquipmentItem = ({ item }: EquipmentItemProps) => (
  <SectionCard>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{item.name}</h3>
          <EquipmentBadges item={item} />
        </div>
        {item.description && (
          <div className="text-sm text-muted-foreground mt-1">
            {item.description}
          </div>
        )}
      </div>
      <EquipmentDetails item={item} />
    </div>
  </SectionCard>
);

export function CharacterEquipment({ character }: CharacterEquipmentProps) {
  if (!character.equipment || character.equipment.length === 0) {
    return <p className="text-muted-foreground">No equipment listed.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {character.equipment.map((item, index) => (
          <EquipmentItem key={index} item={item} />
        ))}
      </div>
    </div>
  );
}