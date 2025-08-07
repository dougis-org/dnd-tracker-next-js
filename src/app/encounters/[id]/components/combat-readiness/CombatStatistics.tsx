import React from 'react';
import { getEncounterStats } from '@/lib/utils/encounter-utils';
import type { Encounter } from '@/lib/validations/encounter';

interface CombatStatisticsProps {
  encounter: Encounter;
}

/**
 * Display combat statistics for encounter participants
 */
export function CombatStatistics({ encounter }: CombatStatisticsProps) {
  const stats = getEncounterStats(encounter);

  if (stats.totalParticipants === 0) {
    return null;
  }

  return (
    <div className="pt-3 border-t space-y-2">
      <p className="text-xs font-medium">Combat Statistics</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Total HP:</span>
          <span className="ml-1">{stats.totalHitPoints}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Avg AC:</span>
          <span className="ml-1">{stats.averageArmorClass}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Players:</span>
          <span className="ml-1">{stats.playerCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Enemies:</span>
          <span className="ml-1">{stats.enemyCount}</span>
        </div>
      </div>
    </div>
  );
}