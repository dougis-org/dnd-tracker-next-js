import { useState, useCallback } from 'react';
import type { EncounterSettings } from '@/lib/validations/encounter';

interface UpdateOptions {
  optimistic?: boolean;
}

interface UseEncounterSettingsReturn {
  loading: boolean;
  error: string | null;
  updateSettings: (
    _settings: Partial<EncounterSettings>,
    _options?: UpdateOptions
  ) => Promise<void>;
  retry: () => Promise<void>;
}

interface LastUpdate {
  settings: Partial<EncounterSettings>;
  options?: UpdateOptions;
}

async function makeApiRequest(encounterId: string, settings: Partial<EncounterSettings>) {
  const response = await fetch(`/api/encounters/${encounterId}/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to update settings');
  }

  return result;
}

export function useEncounterSettings(encounterId: string): UseEncounterSettingsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);

  const updateSettings = useCallback(
    async (settings: Partial<EncounterSettings>, options?: UpdateOptions) => {
      try {
        setLoading(true);
        setError(null);
        setLastUpdate({ settings, options });

        await makeApiRequest(encounterId, settings);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : 'Failed to update encounter settings';
        setError(errorMessage);
        console.error('Failed to update encounter settings:', err);
      } finally {
        setLoading(false);
      }
    },
    [encounterId]
  );

  const retry = useCallback(async () => {
    if (lastUpdate) {
      await updateSettings(lastUpdate.settings, lastUpdate.options);
    }
  }, [lastUpdate, updateSettings]);

  return {
    loading,
    error,
    updateSettings,
    retry,
  };
}