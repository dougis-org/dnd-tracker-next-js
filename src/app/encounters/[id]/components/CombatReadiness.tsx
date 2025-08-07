import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getReadinessChecks, getOverallStatus } from '@/lib/utils/combat-readiness';
import { ReadinessCheckItem } from './combat-readiness/ReadinessCheck';
import { ReadinessBadge } from './combat-readiness/ReadinessBadge';
import { CombatStatistics } from './combat-readiness/CombatStatistics';
import type { Encounter } from '@/lib/validations/encounter';

interface CombatReadinessProps {
  encounter: Encounter;
}

/**
 * Display combat readiness indicators and status checks
 */
export function CombatReadiness({ encounter }: CombatReadinessProps) {
  const readinessChecks = getReadinessChecks(encounter);
  const overallStatus = getOverallStatus(readinessChecks);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Combat Readiness</CardTitle>
          <ReadinessBadge status={overallStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {readinessChecks.map((check, index) => (
          <ReadinessCheckItem key={index} check={check} />
        ))}
        <CombatStatistics encounter={encounter} />
      </CardContent>
    </Card>
  );
}