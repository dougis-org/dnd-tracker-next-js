'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';
import { InitiativeCard } from './InitiativeCard';

interface InitiativeWithParticipant {
  entry: InitiativeEntry;
  participant: ParticipantReference;
}

interface InitiativeListProps {
  initiativeWithParticipants: InitiativeWithParticipant[];
  currentTurn: number;
  onEditInitiative?: (_participantId: string, _newInitiative: number) => void;
  onDelayAction?: (_participantId: string) => void;
  onReadyAction?: (_participantId: string, _triggerCondition: string) => void;
}

export function InitiativeList({
  initiativeWithParticipants,
  currentTurn,
  onEditInitiative,
  onDelayAction,
  onReadyAction
}: InitiativeListProps) {
  return (
    <Card>
      <CardHeader>
        <h3>
          <CardTitle className="text-base">Turn Order</CardTitle>
        </h3>
      </CardHeader>
      <CardContent className="space-y-2">
        {initiativeWithParticipants.map(({ entry, participant }, index) => (
          <InitiativeCard
            key={entry.participantId.toString()}
            entry={entry}
            participant={participant}
            isActive={index === currentTurn}
            isNext={index === (currentTurn + 1) % initiativeWithParticipants.length}
            onEditInitiative={onEditInitiative}
            onDelayAction={onDelayAction}
            onReadyAction={onReadyAction}
          />
        ))}
      </CardContent>
    </Card>
  );
}