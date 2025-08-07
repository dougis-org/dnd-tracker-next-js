'use client';

import { useMemo } from 'react';
import { Encounter, InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';

interface InitiativeWithParticipant {
  entry: InitiativeEntry;
  participant: ParticipantReference;
}

export function useInitiativeData(encounter: Encounter) {
  const initiativeWithParticipants = useMemo(() => {
    const participantMap = new Map(
      encounter.participants.map(p => [p.characterId.toString(), p])
    );

    return encounter.combatState.initiativeOrder
      .map(entry => ({
        entry,
        participant: participantMap.get(entry.participantId.toString()),
      }))
      .filter((item): item is InitiativeWithParticipant =>
        Boolean(item.participant)
      );
  }, [encounter.participants, encounter.combatState.initiativeOrder]);

  const canGoPrevious = useMemo(() => {
    return !(encounter.combatState.currentRound === 1 && encounter.combatState.currentTurn === 0);
  }, [encounter.combatState.currentRound, encounter.combatState.currentTurn]);

  const isPaused = useMemo(() => {
    return Boolean(encounter.combatState.pausedAt);
  }, [encounter.combatState.pausedAt]);

  return {
    initiativeWithParticipants,
    canGoPrevious,
    isPaused
  };
}