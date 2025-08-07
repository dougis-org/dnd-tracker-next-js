'use client';

import { Encounter, InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';

/**
 * Transforms an initiative entry for export
 */
function transformInitiativeEntry(entry: InitiativeEntry, participant: ParticipantReference | undefined) {
  return {
    name: participant?.name || 'Unknown',
    initiative: entry.initiative,
    dexterity: entry.dexterity,
    hasActed: entry.hasActed,
    hitPoints: participant ? `${participant.currentHitPoints}/${participant.maxHitPoints}` : 'Unknown',
    armorClass: participant?.armorClass || 'Unknown',
    conditions: participant?.conditions || []
  };
}

/**
 * Helper function to build export data
 */
export function buildExportData(encounter: Encounter) {
  // Create a Map for O(1) participant lookups instead of O(n) array.find()
  const participantMap = new Map(
    encounter.participants.map(p => [p.characterId.toString(), p])
  );

  return {
    encounterName: encounter.name,
    round: encounter.combatState.currentRound,
    turn: encounter.combatState.currentTurn,
    initiativeOrder: encounter.combatState.initiativeOrder.map(entry => {
      const participant = participantMap.get(entry.participantId.toString());
      return transformInitiativeEntry(entry, participant);
    }),
    exportedAt: new Date().toISOString()
  };
}

/**
 * Helper function to generate filename for export
 */
export function generateExportFilename(encounterName: string, round: number): string {
  return `${encounterName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_initiative_round_${round}.json`;
}

/**
 * Creates a blob and download URL for file download
 */
function createBlobUrl(data: object): string {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  return URL.createObjectURL(dataBlob);
}

/**
 * Creates and triggers a download link
 */
function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper function to create download link
 */
export function createDownloadLink(data: object, filename: string): void {
  const url = createBlobUrl(data);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}