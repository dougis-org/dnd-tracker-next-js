'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import type { IEncounter, IParticipantReference } from '@/lib/models/encounter/interfaces';
import { ParticipantList } from './ParticipantList';
import { ParticipantHeader } from './ParticipantHeader';
import { EmptyParticipantsState } from './EmptyParticipantsState';
import { AddParticipantDialog, EditParticipantDialog, ImportParticipantDialog } from './ParticipantDialogs';
import { useParticipantOperations } from './hooks/useParticipantOperations';
import { useParticipantForm } from './hooks/useParticipantForm';
import type { Character } from '@/lib/validations/character';

// Helper hook for dialog state management
const useDialogState = () => {
  const [dialogState, setDialogState] = useState({
    isAddOpen: false,
    isEditOpen: false,
    isImportOpen: false,
    editingParticipant: null as IParticipantReference | null,
  });

  const openAddDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isAddOpen: true }));
  }, []);

  const closeAddDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isAddOpen: false }));
  }, []);

  const openEditDialog = useCallback((participant: IParticipantReference) => {
    setDialogState(prev => ({
      ...prev,
      isEditOpen: true,
      editingParticipant: participant
    }));
  }, []);

  const closeEditDialog = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isEditOpen: false,
      editingParticipant: null
    }));
  }, []);

  const setImportOpen = useCallback((open: boolean) => {
    setDialogState(prev => ({ ...prev, isImportOpen: open }));
  }, []);

  return {
    dialogState,
    openAddDialog,
    closeAddDialog,
    openEditDialog,
    closeEditDialog,
    setImportOpen,
  };
};

// Helper hook for participant selection
const useParticipantSelection = () => {
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  const handleSelection = useCallback((participantId: string, checked: boolean) => {
    setSelectedParticipants(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(participantId);
      } else {
        newSelection.delete(participantId);
      }
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedParticipants(new Set());
  }, []);

  return {
    selectedParticipants,
    handleSelection,
    clearSelection,
  };
};

interface EncounterParticipantManagerProps {
  encounter: IEncounter;
  onUpdate?: (_updatedEncounter: IEncounter) => void;
}

export function EncounterParticipantManager({
  encounter,
  onUpdate,
}: EncounterParticipantManagerProps) {
  // Hooks
  const { data: session } = useSession();
  const { isLoading, addParticipant, updateParticipant, removeParticipant, reorderParticipants, importParticipants } = useParticipantOperations(encounter, onUpdate);
  const { formData, setFormData, formErrors, resetForm, loadParticipantData, isFormValid } = useParticipantForm();
  const { dialogState, openAddDialog, closeAddDialog, openEditDialog, closeEditDialog, setImportOpen } = useDialogState();
  const { selectedParticipants, handleSelection, clearSelection } = useParticipantSelection();

  // Enhanced dialog handlers with form reset
  const handleCloseAddDialog = useCallback(() => {
    closeAddDialog();
    resetForm();
  }, [closeAddDialog, resetForm]);

  const handleCloseEditDialog = useCallback(() => {
    closeEditDialog();
    resetForm();
  }, [closeEditDialog, resetForm]);

  const handleOpenEditDialog = useCallback((participant: IParticipantReference) => {
    openEditDialog(participant);
    loadParticipantData(participant);
  }, [openEditDialog, loadParticipantData]);

  // Batch operations
  const handleBatchRemove = useCallback(async () => {
    for (const participantId of Array.from(selectedParticipants)) {
      await removeParticipant(participantId);
    }
    clearSelection();
  }, [selectedParticipants, removeParticipant, clearSelection]);

  // Participant operations
  const handleAddParticipant = useCallback(async () => {
    if (!isFormValid(formData)) return;
    await addParticipant(formData, handleCloseAddDialog);
  }, [formData, isFormValid, addParticipant, handleCloseAddDialog]);

  const handleUpdateParticipant = useCallback(async () => {
    if (!dialogState.editingParticipant || !isFormValid(formData)) return;
    await updateParticipant(
      dialogState.editingParticipant.characterId.toString(),
      formData,
      handleCloseEditDialog
    );
  }, [dialogState.editingParticipant, formData, isFormValid, updateParticipant, handleCloseEditDialog]);

  const handleImportCharacters = useCallback(async (characters: Character[]) => {
    await importParticipants(characters, () => setImportOpen(false));
  }, [importParticipants, setImportOpen]);

  // Render helpers
  const renderAddDialog = useCallback(() => (
    <AddParticipantDialog
      isAddDialogOpen={dialogState.isAddOpen}
      onAddDialogOpenChange={(open) => open ? openAddDialog() : handleCloseAddDialog()}
      onAddParticipant={handleAddParticipant}
      isLoading={isLoading}
      formData={formData}
      formErrors={formErrors}
      onFormDataChange={setFormData}
      onResetForm={resetForm}
    />
  ), [
    dialogState.isAddOpen,
    openAddDialog,
    handleCloseAddDialog,
    handleAddParticipant,
    isLoading,
    formData,
    formErrors,
    setFormData,
    resetForm,
  ]);

  const renderImportDialog = useCallback(() => (
    <ImportParticipantDialog
      isImportDialogOpen={dialogState.isImportOpen}
      onImportDialogOpenChange={setImportOpen}
      onImportCharacters={handleImportCharacters}
      userId={session?.user?.id || ''}
    />
  ), [
    dialogState.isImportOpen,
    setImportOpen,
    handleImportCharacters,
    session?.user?.id,
  ]);

  const renderActionButtons = useCallback(() => (
    <>
      {renderAddDialog()}
      {renderImportDialog()}
    </>
  ), [renderAddDialog, renderImportDialog]);

  // Empty state
  if (encounter.participants.length === 0) {
    return (
      <EmptyParticipantsState
        renderAddDialog={renderAddDialog}
        renderImportDialog={renderImportDialog}
      />
    );
  }

  // Main content
  return (
    <Card>
      <ParticipantHeader
        selectedCount={selectedParticipants.size}
        onBatchRemove={handleBatchRemove}
        renderActions={renderActionButtons}
      />

      <CardContent>
        <ParticipantList
          participants={encounter.participants}
          selectedParticipants={selectedParticipants}
          onSelectionChange={handleSelection}
          onEdit={handleOpenEditDialog}
          onRemove={removeParticipant}
          onReorder={reorderParticipants}
        />
      </CardContent>

      <EditParticipantDialog
        isEditDialogOpen={dialogState.isEditOpen}
        onEditDialogOpenChange={(open) => open ? undefined : handleCloseEditDialog()}
        onUpdateParticipant={handleUpdateParticipant}
        isLoading={isLoading}
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={setFormData}
        onResetForm={handleCloseEditDialog}
      />
    </Card>
  );
}