import React from 'react';
import { EncounterActions } from '../EncounterActions';
import type { Encounter } from '@/lib/validations/encounter';

interface EncounterHeaderProps {
  encounter: Encounter;
  onEdit: () => void;
  onStartCombat: () => void;
  onClone: () => void;
}

/**
 * Header section with encounter title and actions
 */
export function EncounterHeader({ encounter, onEdit, onStartCombat, onClone }: EncounterHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{encounter.name}</h1>
        <p className="text-muted-foreground mt-1">
          {encounter.description}
        </p>
      </div>
      <EncounterActions
        encounter={encounter}
        onEdit={onEdit}
        onStartCombat={onStartCombat}
        onClone={onClone}
      />
    </div>
  );
}