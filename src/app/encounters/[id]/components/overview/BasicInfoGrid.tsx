import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatDifficulty, formatStatus } from '@/lib/utils/encounter-utils';
import type { Encounter } from '@/lib/validations/encounter';

interface BasicInfoGridProps {
  encounter: Encounter;
}

/**
 * Display basic encounter information in a grid layout
 */
export function BasicInfoGrid({ encounter }: BasicInfoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Difficulty</p>
        <p className="text-lg">{formatDifficulty(encounter.difficulty)}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Duration</p>
        <p className="text-lg">{formatDuration(encounter.estimatedDuration)}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Target Level</p>
        <p className="text-lg">Level {encounter.targetLevel || 'Any'}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Status</p>
        <Badge variant={encounter.status === 'active' ? 'default' : 'secondary'}>
          {formatStatus(encounter.status)}
        </Badge>
      </div>
    </div>
  );
}