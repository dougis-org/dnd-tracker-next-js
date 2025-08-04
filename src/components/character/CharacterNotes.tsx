import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import type { Character } from '@/lib/validations/character';
import type { CharacterUpdate } from '@/lib/validations/character';

interface CharacterNotesProps {
  character: Character;
  editMode: boolean;
  editedCharacter: CharacterUpdate;
  onUpdateBackstory: (_backstory: string) => void;
  onUpdateNotes: (_notes: string) => void;
  onEnterEditMode: () => void;
}

export function CharacterNotes({
  character,
  editMode,
  editedCharacter,
  onUpdateBackstory,
  onUpdateNotes,
  onEnterEditMode,
}: CharacterNotesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Backstory
            {!editMode && (
              <Button
                data-testid="edit-backstory-button"
                variant="ghost"
                size="sm"
                onClick={onEnterEditMode}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent data-testid="backstory-section">
          {editMode ? (
            <Textarea
              data-testid="backstory-textarea"
              value={editedCharacter.backstory || ''}
              onChange={(e) => onUpdateBackstory(e.target.value)}
              placeholder="Character backstory..."
              className="min-h-32"
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {character.backstory || 'No backstory provided'}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent data-testid="notes-section">
          {editMode ? (
            <Textarea
              data-testid="notes-textarea"
              value={editedCharacter.notes || ''}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Character notes..."
              className="min-h-32"
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {character.notes || 'No notes added'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}