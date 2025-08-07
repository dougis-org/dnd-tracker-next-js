import { useState, useEffect, useCallback } from 'react';
import { EncounterService } from '@/lib/services/EncounterService';
import type { Encounter } from '@/lib/validations/encounter';

/**
 * Extract error message from service result
 */
const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return 'Failed to load encounter';
};

/**
 * Custom hook for managing encounter data loading and state
 */
export function useEncounterData(encounterId: string) {
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEncounter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await EncounterService.getEncounterById(encounterId);

      if (result.success && result.data) {
        setEncounter(result.data);
      } else {
        setError(extractErrorMessage(result.error));
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    loadEncounter();
  }, [encounterId, loadEncounter]);

  const handleRetry = () => {
    loadEncounter();
  };

  const updateEncounter = useCallback((updatedEncounter: Encounter) => {
    setEncounter(updatedEncounter);
  }, []);

  return {
    encounter,
    loading,
    error,
    handleRetry,
    updateEncounter,
  };
}