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

interface EncounterParticipantManagerProps {
  encounter: IEncounter;
  onUpdate?: (_updatedEncounter: IEncounter) => void;
}

export function EncounterParticipantManager({
  encounter,
  onUpdate,
}: EncounterParticipantManagerProps) {
  // State management
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [dialogState, setDialogState] = useState({
    isAddOpen: false,
    isEditOpen: false,
    isImportOpen: false,
    editingParticipant: null as IParticipantReference | null,
  });

  // Hooks
  const { data: session } = useSession();
  const { isLoading, addParticipant, updateParticipant, removeParticipant, reorderParticipants, importParticipants } = useParticipantOperations(encounter, onUpdate);
  const { formData, setFormData, formErrors, resetForm, loadParticipantData, isFormValid } = useParticipantForm();

  // Selection handlers
  const handleParticipantSelection = useCallback((participantId: string, checked: boolean) => {
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

  const handleBatchRemove = useCallback(async () => {
    for (const participantId of Array.from(selectedParticipants)) {
      await removeParticipant(participantId);
    }
    setSelectedParticipants(new Set());
  }, [selectedParticipants, removeParticipant]);

  // Dialog handlers
  const openAddDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isAddOpen: true }));
  }, []);

  const closeAddDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isAddOpen: false }));
    resetForm();
  }, [resetForm]);

  const openEditDialog = useCallback((participant: IParticipantReference) => {
    setDialogState(prev => ({
      ...prev,
      isEditOpen: true,
      editingParticipant: participant
    }));
    loadParticipantData(participant);
  }, [loadParticipantData]);

  const closeEditDialog = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isEditOpen: false,
      editingParticipant: null
    }));
    resetForm();
  }, [resetForm]);

  // Participant operations
  const handleAddParticipant = useCallback(async () => {
    if (!isFormValid(formData)) return;
    await addParticipant(formData, closeAddDialog);
  }, [formData, isFormValid, addParticipant, closeAddDialog]);

  const handleUpdateParticipant = useCallback(async () => {
    if (!dialogState.editingParticipant || !isFormValid(formData)) return;
    await updateParticipant(
      dialogState.editingParticipant.characterId.toString(),
      formData,
      closeEditDialog
    );
  }, [dialogState.editingParticipant, formData, isFormValid, updateParticipant, closeEditDialog]);

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    await removeParticipant(participantId);
  }, [removeParticipant]);

  const handleReorderParticipants = useCallback(async (participantIds: string[]) => {
    await reorderParticipants(participantIds);
  }, [reorderParticipants]);

  const handleImportCharacters = useCallback(async (characters: Character[]) => {
    await importParticipants(characters, () => {
      setDialogState(prev => ({ ...prev, isImportOpen: false }));
    });
  }, [importParticipants]);

  // Render helpers
  const renderActionButtons = useCallback(() => (
    <>
      <AddParticipantDialog
        isAddDialogOpen={dialogState.isAddOpen}
        onAddDialogOpenChange={(open) => open ? openAddDialog() : closeAddDialog()}
        onAddParticipant={handleAddParticipant}
        isLoading={isLoading}
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={setFormData}
        onResetForm={resetForm}
      />
      <ImportParticipantDialog
        isImportDialogOpen={dialogState.isImportOpen}
        onImportDialogOpenChange={(open) =>
          setDialogState(prev => ({ ...prev, isImportOpen: open }))
        }
        onImportCharacters={handleImportCharacters}
        userId={session?.user?.id || ''}
      />
    </>
  ), [
    dialogState.isAddOpen,
    dialogState.isImportOpen,
    openAddDialog,
    closeAddDialog,
    handleAddParticipant,
    handleImportCharacters,
    isLoading,
    formData,
    formErrors,
    setFormData,
    resetForm,
    session?.user?.id,
  ]);

  // Empty state
  if (encounter.participants.length === 0) {
    return (
      <EmptyParticipantsState
        renderAddDialog={() => (
          <AddParticipantDialog
            isAddDialogOpen={dialogState.isAddOpen}
            onAddDialogOpenChange={(open) => open ? openAddDialog() : closeAddDialog()}
            onAddParticipant={handleAddParticipant}
            isLoading={isLoading}
            formData={formData}
            formErrors={formErrors}
            onFormDataChange={setFormData}
            onResetForm={resetForm}
          />
        )}
        renderImportDialog={() => (
          <ImportParticipantDialog
            isImportDialogOpen={dialogState.isImportOpen}
            onImportDialogOpenChange={(open) =>
              setDialogState(prev => ({ ...prev, isImportOpen: open }))
            }
            onImportCharacters={handleImportCharacters}
            userId={session?.user?.id || ''}
          />
        )}
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
          onSelectionChange={handleParticipantSelection}
          onEdit={openEditDialog}
          onRemove={handleRemoveParticipant}
          onReorder={handleReorderParticipants}
        />
      </CardContent>

      <EditParticipantDialog
        isEditDialogOpen={dialogState.isEditOpen}
        onEditDialogOpenChange={(open) => open ? undefined : closeEditDialog()}
        onUpdateParticipant={handleUpdateParticipant}
        isLoading={isLoading}
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={setFormData}
        onResetForm={closeEditDialog}
      />
    </Card>
  );
}