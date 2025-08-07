'use client';

import { Encounter, InitiativeEntry, ParticipantReference } from '@/lib/validations/encounter';

/**
 * Formats an individual initiative entry line
 */
function formatInitiativeEntry(
  entry: InitiativeEntry,
  index: number,
  participant: ParticipantReference | undefined,
  currentTurn: number
): string {
  const activeIndicator = index === currentTurn ? '→ ' : '   ';
  const actedIndicator = entry.hasActed ? ' ✓' : '';
  const hpInfo = participant ? `${participant.currentHitPoints}/${participant.maxHitPoints}` : 'Unknown';
  const participantName = participant?.name || 'Unknown';

  return `${activeIndicator}${entry.initiative}: ${participantName} (${hpInfo} HP)${actedIndicator}`;
}

/**
 * Helper function to build share text
 */
export function buildShareText(encounter: Encounter): string {
  const header = `Initiative Order - ${encounter.name} (Round ${encounter.combatState.currentRound})\n\n`;

  // Create a Map for O(1) participant lookups instead of O(n) array.find()
  const participantMap = new Map(
    encounter.participants.map(p => [p.characterId.toString(), p])
  );

  const orderLines = encounter.combatState.initiativeOrder.map((entry, index) => {
    const participant = participantMap.get(entry.participantId.toString());
    return formatInitiativeEntry(entry, index, participant, encounter.combatState.currentTurn);
  }).join('\n');

  return header + orderLines;
}

/**
 * Creates temporary textarea for clipboard fallback
 */
function createClipboardFallback(text: string): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

/**
 * Helper function to copy text to clipboard with fallbacks
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    createClipboardFallback(text);
  }
}