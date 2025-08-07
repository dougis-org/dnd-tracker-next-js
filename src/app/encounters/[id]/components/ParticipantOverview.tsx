import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Encounter } from '@/lib/validations/encounter';

interface ParticipantOverviewProps {
  encounter: Encounter;
}

/**
 * Display encounter participants with basic stats and type indicators
 */
export function ParticipantOverview({ encounter }: ParticipantOverviewProps) {
  const participants = encounter.participants || [];

  const participantCounts = {
    total: participants.length,
    pc: participants.filter(p => p.isPlayer).length,
    npc: participants.filter(p => !p.isPlayer).length,
  };

  const getParticipantTypeDisplay = (participant: any) => {
    if (participant.isPlayer) return 'PC';
    return participant.type?.toUpperCase() || 'NPC';
  };

  const getParticipantTypeBadgeVariant = (participant: any) => {
    if (participant.isPlayer) return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Participant Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{participantCounts.total}</p>
            <p className="text-sm text-muted-foreground">Participants</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{participantCounts.pc}</p>
            <p className="text-sm text-muted-foreground">Player Character</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{participantCounts.npc}</p>
            <p className="text-sm text-muted-foreground">Non-Player Character</p>
          </div>
        </div>

        {/* Participant List */}
        {participants.length > 0 ? (
          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div
                key={participant.characterId?.toString() || index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant={getParticipantTypeBadgeVariant(participant)}>
                    {getParticipantTypeDisplay(participant)}
                  </Badge>
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    {participant.notes && (
                      <p className="text-sm text-muted-foreground">{participant.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    HP: {participant.currentHitPoints}/{participant.maxHitPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    AC: {participant.armorClass}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No participants added yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}