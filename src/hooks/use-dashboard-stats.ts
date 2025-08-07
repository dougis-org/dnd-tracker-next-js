import { useState, useEffect, useCallback } from 'react';

export interface DashboardStats {
  characters: number;
  encounters: number;
  parties: number;
}

export interface UseDashboardStatsResult {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats>({
    characters: 0,
    encounters: 0,
    parties: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all three counts in parallel, only getting counts (limit=1 for efficiency)
      const [charactersResponse, encountersResponse, partiesResponse] = await Promise.allSettled([
        fetch('/api/characters?page=1&limit=1'),
        fetch('/api/encounters?page=1&limit=1'),
        fetch('/api/parties?page=1&limit=1'),
      ]);

      const newStats: DashboardStats = {
        characters: 0,
        encounters: 0,
        parties: 0,
      };

      // Process characters count
      if (charactersResponse.status === 'fulfilled' && charactersResponse.value.ok) {
        const charactersData = await charactersResponse.value.json();
        if (charactersData.success && charactersData.data?.pagination?.totalItems !== undefined) {
          newStats.characters = charactersData.data.pagination.totalItems;
        }
      }

      // Process encounters count
      if (encountersResponse.status === 'fulfilled' && encountersResponse.value.ok) {
        const encountersData = await encountersResponse.value.json();
        if (encountersData.success && encountersData.data?.totalItems !== undefined) {
          newStats.encounters = encountersData.data.totalItems;
        }
      }

      // Process parties count
      if (partiesResponse.status === 'fulfilled' && partiesResponse.value.ok) {
        const partiesData = await partiesResponse.value.json();
        if (partiesData.success && partiesData.data?.totalItems !== undefined) {
          newStats.parties = partiesData.data.totalItems;
        }
      }

      setStats(newStats);

      // Only set error if ALL requests failed
      const allFailed =
        charactersResponse.status === 'rejected' &&
        encountersResponse.status === 'rejected' &&
        partiesResponse.status === 'rejected';

      if (allFailed) {
        setError('Failed to load dashboard statistics');
      }

    } catch {
      setError('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}