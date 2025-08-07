'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';

interface InitiativeBadgeProps {
  initiative: number;
  isActive: boolean;
}

export function InitiativeBadge({ initiative, isActive }: InitiativeBadgeProps) {
  return (
    <div
      className={`text-lg font-bold px-2 py-1 rounded ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {initiative}
    </div>
  );
}

interface CharacterInfoProps {
  participant: ParticipantReference;
  entry: InitiativeEntry;
  isActive: boolean;
}

export function CharacterInfo({ participant, entry, isActive }: CharacterInfoProps) {
  return (
    <div>
      <div className="flex items-center space-x-2">
        <h3 className={`font-semibold ${isActive ? 'text-primary' : ''}`}>
          {participant.name}
        </h3>
        <Badge variant={participant.isPlayer ? 'default' : 'secondary'}>
          {participant.type}
        </Badge>
        {entry.hasActed && (
          <Badge variant="outline" className="text-xs">
            Acted
          </Badge>
        )}
      </div>
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>AC {participant.armorClass}</span>
        {participant.conditions.length > 0 && (
          <ConditionsList conditions={participant.conditions} />
        )}
      </div>
    </div>
  );
}

interface ConditionsListProps {
  conditions: string[];
}

function ConditionsList({ conditions }: ConditionsListProps) {
  return (
    <div className="flex items-center space-x-1">
      {conditions.map(condition => (
        <Badge key={condition} variant="destructive" className="text-xs">
          {condition}
        </Badge>
      ))}
    </div>
  );
}

interface HPDisplayProps {
  participant: ParticipantReference;
}

/**
 * Gets the appropriate text color class based on HP percentage
 */
function getHPTextColor(hpPercentage: number): string {
  if (hpPercentage <= 25) return 'text-destructive';
  if (hpPercentage < 100) return 'text-amber-600';
  return 'text-foreground';
}

/**
 * Gets the appropriate progress bar color class based on HP percentage
 */
function getHPProgressColor(hpPercentage: number): string {
  if (hpPercentage <= 25) return '[&>div]:bg-destructive';
  if (hpPercentage < 100) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-green-500';
}

export function HPDisplay({ participant }: HPDisplayProps) {
  const hpPercentage = (participant.currentHitPoints / participant.maxHitPoints) * 100;
  const textColorClass = getHPTextColor(hpPercentage);
  const progressColorClass = getHPProgressColor(hpPercentage);

  return (
    <div className="text-right">
      <div className={`text-lg font-bold ${textColorClass}`}>
        {participant.currentHitPoints}/{participant.maxHitPoints}
        {participant.temporaryHitPoints > 0 && (
          <span className="text-blue-600 ml-1">
            (+{participant.temporaryHitPoints})
          </span>
        )}
      </div>
      <Progress
        value={Math.max(hpPercentage, 0)}
        className={`w-20 h-2 ${progressColorClass}`}
      />
    </div>
  );
}

interface CardContainerProps {
  isActive: boolean;
  isNext: boolean;
  children: React.ReactNode;
}

/**
 * Gets card-specific styling based on state
 */
function getCardStateStyles(isActive: boolean, isNext: boolean): string {
  if (isActive) {
    return 'border-primary bg-primary/5 shadow-md';
  }

  if (isNext) {
    return 'border-amber-200 bg-amber-50';
  }

  return 'border-border bg-card';
}

export function CardContainer({ isActive, isNext, children }: CardContainerProps) {
  const baseClass = 'p-3 rounded-lg border transition-all';
  const stateStyles = getCardStateStyles(isActive, isNext);
  const className = `${baseClass} ${stateStyles}`;

  return <div className={className}>{children}</div>;
}