'use client';

import React from 'react';
import { InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';
import { CardContainer, InitiativeBadge, CharacterInfo, HPDisplay } from './InitiativeCardComponents';

interface InitiativeCardProps {
  entry: InitiativeEntry;
  participant: ParticipantReference;
  isActive: boolean;
  isNext: boolean;
  onEditInitiative?: (_participantId: string, _newInitiative: number) => void;
  onDelayAction?: (_participantId: string) => void;
  onReadyAction?: (_participantId: string, _triggerCondition: string) => void;
}

export function InitiativeCard({
  entry,
  participant,
  isActive,
  isNext,
  onEditInitiative: _onEditInitiative,
  onDelayAction: _onDelayAction,
  onReadyAction: _onReadyAction
}: InitiativeCardProps) {
  return (
    <CardContainer isActive={isActive} isNext={isNext}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <InitiativeBadge initiative={entry.initiative} isActive={isActive} />
          <CharacterInfo participant={participant} entry={entry} isActive={isActive} />
        </div>
        <HPDisplay participant={participant} />
      </div>
    </CardContainer>
  );
}