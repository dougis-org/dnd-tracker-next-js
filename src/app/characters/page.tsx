'use client';

import { useUser } from '@clerk/nextjs';
import { CharacterListView } from '@/components/character/CharacterListView';
import { CharacterCreationForm } from '@/components/forms/character/CharacterCreationForm';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useCharacterPageActions } from './hooks/useCharacterPageActions';

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-lg text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function CharactersPage() {
  const { user, isLoaded } = useUser();
  const actions = useCharacterPageActions();

  if (!isLoaded) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
          <p className="text-muted-foreground">
            Manage and organize your D&D characters
          </p>
        </div>
        <Button onClick={actions.openCreationForm} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create Character
        </Button>
      </div>

      {/* Character List */}
      <CharacterListView
        userId={user?.id || ''}
        onCharacterSelect={actions.selectCharacter}
        onCharacterEdit={actions.editCharacter}
        onCharacterDelete={actions.deleteCharacter}
        onCharacterDuplicate={actions.duplicateCharacter}
        onCreateCharacter={actions.openCreationForm}
      />

      {/* Character Creation Modal */}
      <CharacterCreationForm
        ownerId={user?.id || ''}
        isOpen={actions.isCreationFormOpen}
        onSuccess={actions.handleCreationSuccess}
        onCancel={actions.closeCreationForm}
      />
    </div>
  );
}