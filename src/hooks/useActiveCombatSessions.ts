import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Types for combat data
interface CombatParticipant {
  characterId: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  currentHitPoints?: number;
  maxHitPoints?: number;
  armorClass?: number;
}

interface InitiativeEntry {
  participantId: string;
  initiative: number;
  isActive: boolean;
  hasActed: boolean;
}

interface CombatState {
  isActive: boolean;
  currentRound: number;
  currentTurn: number;
  initiativeOrder: InitiativeEntry[];
}

interface ActiveEncounter {
  _id: string;
  name: string;
  combatState: CombatState;
  participants: CombatParticipant[];
}

interface UseActiveCombatSessionsReturn {
  encounters: ActiveEncounter[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for managing active combat sessions
 *
 * Handles fetching, caching, and refreshing active combat sessions
 * with proper authentication and error handling.
 */
export function useActiveCombatSessions(): UseActiveCombatSessionsReturn {
  const { data: session, status } = useSession();
  const [encounters, setEncounters] = useState<ActiveEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch active combat sessions
  const fetchActiveCombatSessions = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/encounters?status=active&combat=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEncounters(data.encounters || []);
    } catch (err) {
      console.error('Error fetching active combat sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch combat sessions');
      setEncounters([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Load data on mount and when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchActiveCombatSessions();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, fetchActiveCombatSessions]);

  return {
    encounters,
    isLoading,
    error,
    refetch: fetchActiveCombatSessions,
  };
}

// Export types for use in components
export type {
  ActiveEncounter,
  CombatState,
  CombatParticipant,
  InitiativeEntry,
};