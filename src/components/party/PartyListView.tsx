'use client';

import { useState } from 'react';
import { BatchActions } from './BatchActions';
import { Pagination } from '@/components/shared/Pagination';
import { usePartyData } from './hooks/usePartyData';
import { usePartyFilters } from './hooks/usePartyFilters';
import { usePartySelection } from './hooks/usePartySelection';
import { ErrorFallback } from './PartyListView/ErrorFallback';
import { ControlsSection } from './PartyListView/ControlsSection';
import { ContentSection } from './PartyListView/ContentSection';
import { PartyCreateModal } from './PartyCreateModal';

// Hook for managing party list state
function usePartyListState() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filterState = usePartyFilters();
  const { filters, searchQuery, sortBy, sortOrder } = filterState;

  const dataState = usePartyData({
    filters,
    searchQuery,
    sortBy,
    sortOrder,
  });

  const selectionState = usePartySelection(dataState.parties);

  return {
    viewMode,
    setViewMode,
    filterState,
    dataState,
    selectionState,
  };
}

// Utility function to build filter callbacks
function buildFilterCallbacks(filterState: ReturnType<typeof usePartyFilters>) {
  return {
    onFiltersChange: filterState.updateFilters,
    onSearchChange: filterState.updateSearchQuery,
    onSortChange: filterState.updateSort,
    onClearFilters: filterState.clearFilters,
  };
}

// Utility function to build grid props
function buildGridProps(dataState: ReturnType<typeof usePartyData>, selectionState: ReturnType<typeof usePartySelection>) {
  return {
    parties: dataState.parties,
    isLoading: dataState.isLoading,
    selectedParties: selectionState.selectedParties,
    onSelectParty: selectionState.selectParty,
    onRefetch: dataState.refetch,
  };
}

// Utility function to build table props
function buildTableProps(
  dataState: ReturnType<typeof usePartyData>,
  selectionState: ReturnType<typeof usePartySelection>,
  filterState: ReturnType<typeof usePartyFilters>
) {
  return {
    parties: dataState.parties,
    isLoading: dataState.isLoading,
    sortConfig: {
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      onSort: filterState.updateSort,
    },
    selectionConfig: {
      selectedParties: selectionState.selectedParties,
      isAllSelected: selectionState.isAllSelected,
      onSelectAll: selectionState.selectAll,
      onSelectParty: selectionState.selectParty,
    },
    onRefetch: dataState.refetch,
  };
}

interface PartyListViewProps {
  userId: string;
}

export function PartyListView({ userId: _userId }: PartyListViewProps) {
  const { viewMode, setViewMode, filterState, dataState, selectionState } = usePartyListState();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateParty = () => {
    setIsCreateModalOpen(true);
  };

  const handlePartyCreated = () => {
    // Refetch the party list to show the new party
    dataState.refetch();
  };

  if (dataState.error) {
    return <ErrorFallback onRetry={dataState.refetch} error={dataState.error} />;
  }

  return (
    <div className="space-y-6">
      <ControlsSection
        filters={filterState.filters}
        searchQuery={filterState.searchQuery}
        sortConfig={{ sortBy: filterState.sortBy, sortOrder: filterState.sortOrder }}
        filterCallbacks={buildFilterCallbacks(filterState)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateParty={handleCreateParty}
      />

      {selectionState.hasSelection && (
        <BatchActions
          selectedCount={selectionState.selectedParties.length}
          selectedParties={selectionState.selectedParties}
          onClearSelection={selectionState.clearSelection}
          onRefetch={dataState.refetch}
        />
      )}

      <ContentSection
        viewMode={viewMode}
        gridProps={buildGridProps(dataState, selectionState)}
        tableProps={buildTableProps(dataState, selectionState, filterState)}
      />

      {dataState.pagination && (
        <Pagination
          currentPage={dataState.pagination.currentPage}
          totalPages={dataState.pagination.totalPages}
          totalItems={dataState.pagination.totalItems}
          onPageChange={dataState.goToPage}
        />
      )}

      {/* Party creation modal */}
      <PartyCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onPartyCreated={handlePartyCreated}
      />
    </div>
  );
}