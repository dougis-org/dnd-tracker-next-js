'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PartyListItem, PartyFilters, PartySortBy, SortOrder, PaginationInfo } from '../types';

interface UsePartyDataParams {
  filters: PartyFilters;
  searchQuery: string;
  sortBy: PartySortBy;
  sortOrder: SortOrder;
  page?: number;
  limit?: number;
}

interface UsePartyDataReturn {
  parties: PartyListItem[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  goToPage: (_page: number) => void;
  refetch: () => void;
}


// Hook for managing party data state
function usePartyState(initialPage: number = 1) {
  const [parties, setParties] = useState<PartyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  return {
    parties, setParties,
    isLoading, setIsLoading,
    error, setError,
    pagination, setPagination,
    currentPage, setCurrentPage,
  };
}

// Hook for party data operations
function usePartyOperations(state: ReturnType<typeof usePartyState>, params: UsePartyDataParams) {
  const { filters, searchQuery, sortBy, sortOrder, limit = 20 } = params;
  const { setParties, setIsLoading, setError, setPagination, currentPage, setCurrentPage } = state;

  const fetchParties = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add pagination
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', limit.toString());

      // Add sorting
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);

      // Add search if present
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      // Add filters
      if (filters.tags.length > 0) {
        queryParams.set('tags', filters.tags.join(','));
      }
      if (filters.memberCount.length > 0) {
        queryParams.set('memberCount', filters.memberCount.join(','));
      }
      if (filters.isPublic !== undefined) {
        queryParams.set('isPublic', filters.isPublic.toString());
      }

      // Fetch data from API
      const response = await fetch(`/api/parties?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch parties' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch parties');
      }

      setParties(data.parties || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching parties');
      setParties([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, sortBy, sortOrder, currentPage, limit, setParties, setIsLoading, setError, setPagination]);

  const goToPage = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, [setCurrentPage]);

  const refetch = useCallback(() => {
    fetchParties();
  }, [fetchParties]);

  return { fetchParties, goToPage, refetch };
}

export function usePartyData({
  filters,
  searchQuery,
  sortBy,
  sortOrder,
  page: _page = 1,
  limit = 20,
}: UsePartyDataParams): UsePartyDataReturn {
  const state = usePartyState(_page);
  const { fetchParties, goToPage, refetch } = usePartyOperations(state, {
    filters, searchQuery, sortBy, sortOrder, page: _page, limit
  });

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  return {
    parties: state.parties,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    goToPage,
    refetch,
  };
}