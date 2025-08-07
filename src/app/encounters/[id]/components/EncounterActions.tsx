import React from 'react';
import { canStartCombat } from '@/lib/utils/encounter-utils';
import { useCombatStart } from '@/lib/hooks/useCombatStart';
import { ActionButtons } from './actions/ActionButtons';
import { StartCombatDialog } from './actions/StartCombatDialog';
import type { Encounter } from '@/lib/validations/encounter';

interface EncounterActionsProps {
  encounter: Encounter;
  onEdit: () => void;
  onStartCombat: () => void;
  onClone: () => void;
}

/**
 * Primary action buttons for encounter management
 */
export function EncounterActions({ encounter, onEdit, onStartCombat, onClone }: EncounterActionsProps) {
  const {
    showStartCombatDialog,
    handleStartCombat,
    confirmStartCombat,
    cancelStartCombat,
  } = useCombatStart(onStartCombat);

  const canStart = canStartCombat(encounter);

  return (
    <>
      <ActionButtons
        canStartCombat={canStart}
        onStartCombat={handleStartCombat}
        onEdit={onEdit}
        onClone={onClone}
      />

      <StartCombatDialog
        open={showStartCombatDialog}
        encounter={encounter}
        onConfirm={confirmStartCombat}
        onCancel={cancelStartCombat}
      />
    </>
  );
}