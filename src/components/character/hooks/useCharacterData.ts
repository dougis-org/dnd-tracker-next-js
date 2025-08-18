import { useState, useEffect, useCallback } from 'react';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import { DEFAULT_PAGE_SIZE } from '../constants';
import type { Character } from '@/lib/validations/character';

// Client-safe paginated characters type
interface ClientPaginatedCharacters {
  items: Character[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface UseCharacterDataResult {
  loading: boolean;
  error: string | null;
  charactersData: ClientPaginatedCharacters | null;
  currentPage: number;
  setCurrentPage: (_page: number) => void;
  reloadData: () => void;
}

export function useCharacterData(userId: string): UseCharacterDataResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [charactersData, setCharactersData] = useState<ClientPaginatedCharacters | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await CharacterServiceClient.getCharactersByOwner(userId, currentPage, DEFAULT_PAGE_SIZE);

      if (result.success) {
        // Use Character types directly - no conversion needed
        const clientData: ClientPaginatedCharacters = {
          items: result.data.items,
          pagination: result.data.pagination
        };
        setCharactersData(clientData);
      } else {
        setError(result.error?.message || 'An unknown error occurred while fetching characters.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentPage]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  return {
    loading,
    error,
    charactersData,
    currentPage,
    setCurrentPage,
    reloadData: loadCharacters,
  };
}