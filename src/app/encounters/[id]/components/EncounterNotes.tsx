import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEditableContent } from '@/lib/hooks/useEditableContent';
import { EditableDescription } from './notes/EditableDescription';
import { DescriptionDisplay, DescriptionHeader } from './notes/DescriptionDisplay';
import { NotesSection } from './notes/NotesSection';
import type { Encounter } from '@/lib/validations/encounter';

interface EncounterNotesProps {
  encounter: Encounter;
  isEditing: boolean;
  onToggleEdit: () => void;
}

/**
 * Display and allow editing of encounter notes and description
 */
export function EncounterNotes({ encounter, isEditing, onToggleEdit }: EncounterNotesProps) {
  const {
    editedValue,
    isSaving,
    handleSave,
    handleCancel,
    handleChange,
  } = useEditableContent(encounter.description || '');

  const handleSaveAndClose = async () => {
    await handleSave();
    onToggleEdit();
  };

  const handleCancelAndClose = () => {
    handleCancel();
    onToggleEdit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? (
            'Description'
          ) : (
            <DescriptionHeader onEdit={onToggleEdit} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <EditableDescription
            value={editedValue}
            isSaving={isSaving}
            onChange={handleChange}
            onSave={handleSaveAndClose}
            onCancel={handleCancelAndClose}
          />
        ) : (
          <DescriptionDisplay
            description={encounter.description}
            onEdit={onToggleEdit}
          />
        )}
        <NotesSection />
      </CardContent>
    </Card>
  );
}