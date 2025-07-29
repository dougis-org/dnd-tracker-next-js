'use client';

import { Metadata } from 'next';
import { CharacterListView } from '@/components/character/CharacterListView';
import { CharacterCreationForm } from '@/components/forms/character/CharacterCreationForm';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useCharacterPageActions } from './hooks/useCharacterPageActions';
import AuthenticatedClientWrapper from '@/components/layout/AuthenticatedClientWrapper';
import { useSession } from 'next-auth/react';

// Note: Metadata export won't work in client components, but keeping for reference
const _metadata: Metadata = {
  title: 'Characters - D&D Encounter Tracker',
  description: 'Manage and organize your D&D characters',
};

/**
 * Improved Characters page with proper authentication architecture
 *
 * This demonstrates the correct pattern:
 * 1. Middleware handles authentication and redirects
 * 2. AuthenticatedClientWrapper provides session without loading states
 * 3. Component focuses on functionality, not authentication
 *
 * Benefits:
 * - No redundant authentication checks
 * - No loading states for authentication
 * - Cleaner component logic
 * - Better user experience
 */
export default function CharactersImprovedPage() {
  return (
    <AuthenticatedClientWrapper>
      <CharactersContent />
    </AuthenticatedClientWrapper>
  );
}

function CharactersContent() {
  const { data: session } = useSession();
  const actions = useCharacterPageActions();

  // Session is guaranteed to exist due to middleware + wrapper
  const userId = session?.user?.id || '';

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
        userId={userId}
        onCharacterSelect={actions.selectCharacter}
        onCharacterEdit={actions.editCharacter}
        onCharacterDelete={actions.deleteCharacter}
        onCharacterDuplicate={actions.duplicateCharacter}
        onCreateCharacter={actions.openCreationForm}
      />

      {/* Character Creation Modal */}
      <CharacterCreationForm
        ownerId={userId}
        isOpen={actions.isCreationFormOpen}
        onSuccess={actions.handleCreationSuccess}
        onCancel={actions.closeCreationForm}
      />
    </div>
  );
}