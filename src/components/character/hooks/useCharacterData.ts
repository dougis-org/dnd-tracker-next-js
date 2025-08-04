import { useState, useEffect, useCallback } from 'react';
import { CharacterService } from '@/lib/services/CharacterService';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { convertICharactersToCharacters } from '@/lib/utils/character-conversion';
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

      const result = await CharacterService.getCharactersByOwner(userId, currentPage, DEFAULT_PAGE_SIZE);

      if (result.success) {
        // Convert ICharacter types to client-safe Character types
        const clientData: ClientPaginatedCharacters = {
          items: convertICharactersToCharacters(result.data.items),
          pagination: {
            page: result.data.pagination.page,
            totalPages: result.data.pagination.totalPages,
            totalItems: result.data.pagination.total,
            itemsPerPage: result.data.pagination.limit
          }
        };
        setCharactersData(clientData);
      } else {
        setError(result.error?.message || 'Failed to load characters');
      }
    } catch {
      setError('Failed to load characters');
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