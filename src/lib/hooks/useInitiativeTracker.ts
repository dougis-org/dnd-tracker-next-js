'use client';

import { useCallback, useState } from 'react';
import { Encounter } from '@/lib/validations/encounter';
import {
  makeRequest,
  buildExportData,
  createDownloadLink,
  generateExportFilename,
  buildShareText,
  copyToClipboard
} from '@/components/combat/useInitiativeHelpers';

interface UseInitiativeTrackerProps {
  encounter: Encounter;
  onEncounterUpdate?: (_encounter: Encounter) => void;
}

interface UseInitiativeTrackerReturn {
  isLoading: boolean;
  error: string | null;
  handleNextTurn: () => Promise<void>;
  handlePreviousTurn: () => Promise<void>;
  handlePauseCombat: () => Promise<void>;
  handleResumeCombat: () => Promise<void>;
  handleEndCombat: () => Promise<void>;
  handleEditInitiative: (_participantId: string, _newInitiative: number) => Promise<void>;
  handleDelayAction: (_participantId: string) => Promise<void>;
  handleReadyAction: (_participantId: string, _triggerCondition: string) => Promise<void>;
  handleExportInitiative: () => void;
  handleShareInitiative: () => void;
}

/**
 * Hook for managing initiative tracker state and actions
 *
 * Provides handlers for all initiative tracker operations including:
 * - Turn progression (next/previous)
 * - Combat state management (pause/resume/end)
 * - Initiative editing
 * - Export and sharing functionality
 */
export function useInitiativeTracker({
  encounter,
  onEncounterUpdate
}: UseInitiativeTrackerProps): UseInitiativeTrackerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeApiCall = useCallback(async (
    endpoint: string,
    method: string = 'PATCH',
    body?: any
  ) => {
    return makeRequest({
      url: `/api/encounters/${encounter._id}/${endpoint}`,
      method,
      body,
      setIsLoading,
      setError,
      onEncounterUpdate
    });
  }, [encounter._id, onEncounterUpdate]);

  const handleNextTurn = useCallback(async () => {
    await makeApiCall('combat/next-turn');
  }, [makeApiCall]);

  const handlePreviousTurn = useCallback(async () => {
    await makeApiCall('combat/previous-turn');
  }, [makeApiCall]);

  const handlePauseCombat = useCallback(async () => {
    await makeApiCall('combat/pause');
  }, [makeApiCall]);

  const handleResumeCombat = useCallback(async () => {
    await makeApiCall('combat/resume');
  }, [makeApiCall]);

  const handleEndCombat = useCallback(async () => {
    await makeApiCall('combat/end');
  }, [makeApiCall]);

  const handleEditInitiative = useCallback(async (
    participantId: string,
    newInitiative: number
  ) => {
    await makeApiCall('combat/initiative', 'PATCH', {
      participantId,
      initiative: newInitiative
    });
  }, [makeApiCall]);

  const handleDelayAction = useCallback(async (participantId: string) => {
    await makeApiCall('combat/delay-action', 'PATCH', {
      participantId
    });
  }, [makeApiCall]);

  const handleReadyAction = useCallback(async (
    participantId: string,
    triggerCondition: string
  ) => {
    await makeApiCall('combat/ready-action', 'PATCH', {
      participantId,
      triggerCondition
    });
  }, [makeApiCall]);

  /**
   * Validates that combat is active
   */
  const validateCombatActive = useCallback((): boolean => {
    if (!encounter.combatState.isActive) {
      setError('Combat must be active to export initiative data');
      return false;
    }
    return true;
  }, [encounter.combatState.isActive]);

  /**
   * Attempts to share using native share API with clipboard fallback
   */
  const attemptShare = useCallback(async (shareText: string, title: string): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText });
        return;
      } catch {
        // Fall through to clipboard fallback
      }
    }
    await copyToClipboard(shareText);
  }, []);

  const handleExportInitiative = useCallback(() => {
    if (!validateCombatActive()) return;

    try {
      const exportData = buildExportData(encounter);
      const filename = generateExportFilename(encounter.name, encounter.combatState.currentRound);
      createDownloadLink(exportData, filename);
    } catch {
      setError('Failed to export initiative data');
    }
  }, [encounter, validateCombatActive]);

  const handleShareInitiative = useCallback(async () => {
    if (!validateCombatActive()) return;

    try {
      const shareText = buildShareText(encounter);
      const title = `Initiative Order - ${encounter.name}`;
      await attemptShare(shareText, title);
    } catch {
      setError('Failed to share initiative data');
    }
  }, [encounter, validateCombatActive, attemptShare]);

  return {
    isLoading,
    error,
    handleNextTurn,
    handlePreviousTurn,
    handlePauseCombat,
    handleResumeCombat,
    handleEndCombat,
    handleEditInitiative,
    handleDelayAction,
    handleReadyAction,
    handleExportInitiative,
    handleShareInitiative
  };
}