'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EncounterListItem, EncounterFilters, SortBy, SortOrder, PaginationInfo } from '../types';
import {
  fetchEncountersData,
  processSuccessfulResponse,
  processErrorResponse
} from './utils/dataFetchHelpers';

interface UseEncounterDataParams {
  filters: EncounterFilters;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  page?: number;
  limit?: number;
}

interface UseEncounterDataReturn {
  encounters: EncounterListItem[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  goToPage: (_page: number) => void;
  refetch: () => void;
}

export function useEncounterData({
  filters,
  searchQuery,
  sortBy,
  sortOrder,
  page = 1,
  limit = 20,
}: UseEncounterDataParams): UseEncounterDataReturn {
  const [encounters, setEncounters] = useState<EncounterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(page);

  const handleSuccessfulResponse = useCallback((data: any) => {
    const { encounters, pagination } = processSuccessfulResponse(data, limit);
    setEncounters(encounters);
    setPagination(pagination);
    setError(null);
  }, [limit]);

  const handleErrorResponse = useCallback((error: any) => {
    console.error('An error occurred while fetching encounters:', error);
    const { errorMessage } = processErrorResponse(error);
    setError(errorMessage || 'An unknown error occurred while fetching encounters.');
    setEncounters([]);
    setPagination(null);
  }, []);

  const fetchEncounters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await fetchEncountersData(
        filters,
        searchQuery,
        sortBy,
        sortOrder,
        currentPage,
        limit
      );
      handleSuccessfulResponse(data);
    } catch (err) {
      handleErrorResponse(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, sortBy, sortOrder, currentPage, limit, handleSuccessfulResponse, handleErrorResponse]);

  const goToPage = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const refetch = useCallback(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, sortBy, sortOrder]);

  return {
    encounters,
    isLoading,
    error,
    pagination,
    goToPage,
    refetch,
  };
}