import { rerollInitiative } from '@/lib/models/encounter/initiative-rolling';
import { withCombatValidation } from '../api-wrapper';
import type { IEncounter } from '@/lib/models/encounter/interfaces';

/**
 * Validates initiative order exists and is not empty
 */
function validateInitiativeOrder(encounter: IEncounter): void {
  if (!encounter.combatState.initiativeOrder || encounter.combatState.initiativeOrder.length === 0) {
    throw new Error('No initiative order found. Roll initiative first.');
  }
}

/**
 * Validates participant exists in initiative order if provided
 */
function validateParticipantExists(encounter: IEncounter, participantId?: string): void {
  if (!participantId) return;

  const existingEntry = encounter.combatState.initiativeOrder.find(
    entry => entry.participantId.toString() === participantId
  );

  if (!existingEntry) {
    throw new Error(`Participant with ID ${participantId} not found in initiative order`);
  }
}

/**
 * Gets the current active participant ID
 */
function getCurrentActiveParticipantId(encounter: IEncounter): string | null {
  const currentActiveIndex = encounter.combatState.initiativeOrder.findIndex(entry => entry.isActive);
  return currentActiveIndex >= 0
    ? encounter.combatState.initiativeOrder[currentActiveIndex].participantId.toString()
    : null;
}

/**
 * Restores the active participant after reroll
 */
function restoreActiveParticipant(encounter: IEncounter, activeParticipantId: string | null): void {
  if (!encounter.combatState.isActive || !activeParticipantId) return;

  const newActiveIndex = encounter.combatState.initiativeOrder.findIndex(
    entry => entry.participantId.toString() === activeParticipantId
  );

  if (newActiveIndex < 0) return;

  // Reset all active states and set the new active participant in one pass
  encounter.combatState.initiativeOrder.forEach((entry, index) => {
    entry.isActive = (index === newActiveIndex);
  });

  encounter.combatState.currentTurn = newActiveIndex;
}

export const POST = withCombatValidation(
  {
    operation: 'rerolling initiative',
    requireBody: false,
    requiredFields: [],
  },
  async (encounter, _userId, body) => {
    const bodyData = body || {};
    const { participantId } = bodyData;

    // Validate preconditions
    validateInitiativeOrder(encounter);
    validateParticipantExists(encounter, participantId);

    // Store current active participant to maintain combat state
    const currentActiveParticipantId = getCurrentActiveParticipantId(encounter);

    // Reroll initiative
    encounter.combatState.initiativeOrder = rerollInitiative(
      encounter.combatState.initiativeOrder,
      participantId
    );

    // Restore active participant if combat is active
    restoreActiveParticipant(encounter, currentActiveParticipantId);

    return true;
  }
);