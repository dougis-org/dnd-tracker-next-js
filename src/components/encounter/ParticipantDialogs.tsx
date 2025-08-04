'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Download } from 'lucide-react';
import { ParticipantForm } from './ParticipantForm';
import { CharacterLibraryInterface } from './CharacterLibraryInterface';
import type { ParticipantFormData } from './hooks/useParticipantForm';
import type { ICharacter } from '@/lib/models/Character';
import type { Character } from '@/lib/validations/character';

interface BaseDialogProps {
  isOpen: boolean;
  onOpenChange: (_open: boolean) => void;
  onReset: () => void;
}

interface FormDialogProps extends BaseDialogProps {
  title: string;
  description: string;
  onSubmit: () => void;
  isLoading: boolean;
  formData: ParticipantFormData;
  formErrors: Record<string, string>;
  onFormDataChange: (_data: ParticipantFormData) => void;
  submitLabel: string;
  loadingLabel: string;
}

const FormDialog = ({
  isOpen,
  onOpenChange,
  onReset,
  title,
  description,
  onSubmit,
  isLoading,
  formData,
  formErrors,
  onFormDataChange,
  submitLabel,
  loadingLabel,
}: FormDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <ParticipantForm
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={onFormDataChange}
      />
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false);
            onReset();
          }}
        >
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface ParticipantDialogsProps {
  // Add dialog props
  isAddDialogOpen: boolean;
  onAddDialogOpenChange: (_open: boolean) => void;
  onAddParticipant: () => void;
  isLoading: boolean;
  // Edit dialog props
  isEditDialogOpen: boolean;
  onEditDialogOpenChange: (_open: boolean) => void;
  onUpdateParticipant: () => void;
  // Import dialog props
  isImportDialogOpen: boolean;
  onImportDialogOpenChange: (_open: boolean) => void;
  onImportCharacters: (_characters: ICharacter[]) => void;
  userId: string;
  // Form props
  formData: ParticipantFormData;
  formErrors: Record<string, string>;
  onFormDataChange: (_data: ParticipantFormData) => void;
  onResetForm: () => void;
}

export function AddParticipantDialog({
  isAddDialogOpen,
  onAddDialogOpenChange,
  onAddParticipant,
  isLoading,
  formData,
  formErrors,
  onFormDataChange,
  onResetForm,
}: Pick<ParticipantDialogsProps, 'isAddDialogOpen' | 'onAddDialogOpenChange' | 'onAddParticipant' | 'isLoading' | 'formData' | 'formErrors' | 'onFormDataChange' | 'onResetForm'>) {
  return (
    <>
      <Dialog open={isAddDialogOpen} onOpenChange={onAddDialogOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Character
          </Button>
        </DialogTrigger>
      </Dialog>
      <FormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={onAddDialogOpenChange}
        onReset={onResetForm}
        title="Add Participant"
        description="Add a new character or NPC to the encounter"
        onSubmit={onAddParticipant}
        isLoading={isLoading}
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={onFormDataChange}
        submitLabel="Add Participant"
        loadingLabel="Adding..."
      />
    </>
  );
}

export function EditParticipantDialog({
  isEditDialogOpen,
  onEditDialogOpenChange,
  onUpdateParticipant,
  isLoading,
  formData,
  formErrors,
  onFormDataChange,
  onResetForm,
}: Pick<ParticipantDialogsProps, 'isEditDialogOpen' | 'onEditDialogOpenChange' | 'onUpdateParticipant' | 'isLoading' | 'formData' | 'formErrors' | 'onFormDataChange' | 'onResetForm'>) {
  return (
    <FormDialog
      isOpen={isEditDialogOpen}
      onOpenChange={onEditDialogOpenChange}
      onReset={onResetForm}
      title="Edit Participant"
      description="Update the participant's information"
      onSubmit={onUpdateParticipant}
      isLoading={isLoading}
      formData={formData}
      formErrors={formErrors}
      onFormDataChange={onFormDataChange}
      submitLabel="Update Participant"
      loadingLabel="Updating..."
    />
  );
}

export function ImportParticipantDialog({
  isImportDialogOpen,
  onImportDialogOpenChange,
  onImportCharacters,
  userId,
}: Pick<ParticipantDialogsProps, 'isImportDialogOpen' | 'onImportDialogOpenChange' | 'onImportCharacters' | 'userId'>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImportCharacters = async (characters: Character[]) => {
    if (characters.length === 0) return;

    setIsLoading(true);
    try {
      // For now, import all characters directly since they're already client-safe Character types
      // TODO: Add proper validation for Character[] type when needed
      if (characters.length > 0) {
        await onImportCharacters(characters as any); // Type assertion needed for now until interfaces are fully aligned
        onImportDialogOpenChange(false);
      }
    } catch (error) {
      console.error('Error importing characters:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isImportDialogOpen} onOpenChange={onImportDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Import from Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Characters</DialogTitle>
          <DialogDescription>
            Select characters from your library to add to this encounter
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CharacterLibraryInterface
            onImportCharacters={handleImportCharacters}
            isLoading={isLoading}
            userId={userId}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onImportDialogOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}