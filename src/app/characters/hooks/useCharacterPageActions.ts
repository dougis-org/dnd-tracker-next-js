import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useConfirmationDialog } from '@/components/modals/ConfirmationDialog';
import { CharacterService } from '@/lib/services/CharacterService';
import type { Character } from '@/lib/validations/character';

/**
 * Custom hook for managing character page actions
 * Reduces complexity by centralizing character action handlers
 */
export function useCharacterPageActions() {
  const router = useRouter();
  const { user } = useUser();
  const { confirm, ConfirmationDialog } = useConfirmationDialog();
  const [isCreationFormOpen, setIsCreationFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const navigationActions = {
    selectCharacter: (character: Character) => {
      if (character._id) {
        router.push(`/characters/${character._id.toString()}`);
      }
    },

    editCharacter: (character: Character) => {
      if (character._id) {
        router.push(`/characters/${character._id.toString()}`);
      }
    },
  };

  const characterActions = {
    deleteCharacter: async (character: Character) => {
      if (!user?.id) {
        return;
      }

      try {
        const confirmed = await confirm({
          title: 'Delete Character',
          description: `Are you sure you want to delete "${character.name}"? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          variant: 'destructive',
          loading: isDeleting,
          onConfirm: () => {},
        });

        if (confirmed && character._id) {
          setIsDeleting(true);
          try {
            const result = await CharacterService.deleteCharacter(
              character._id.toString(),
              user.id
            );

            if (!result.success) {
              console.error('Failed to delete character:', result.error);
              // TODO: Show error toast notification
            }
          } catch (error) {
            console.error('Error deleting character:', error);
            // TODO: Show error toast notification
          } finally {
            setIsDeleting(false);
          }
        }

        return confirmed;
      } catch (error) {
        console.error('Error in delete confirmation:', error);
      }
    },

    duplicateCharacter: async (character: Character) => {
      if (!user?.id) {
        return;
      }

      // Simple prompt for character name
      const newName = prompt(`Enter name for the duplicate character:`, `${character.name} (Copy)`);

      if (!newName) {
        return false; // User cancelled
      }

      if (!character._id) {
        return false;
      }

      setIsDuplicating(true);
      try {
        const result = await CharacterService.cloneCharacter(
          character._id.toString(),
          user.id,
          newName
        );

        if (result.success) {
          // TODO: Show success toast notification
          if (result.data?._id) {
            router.push(`/characters/${result.data._id.toString()}`);
          }
          return true;
        } else {
          console.error('Failed to duplicate character:', result.error);
          // TODO: Show error toast notification
          return false;
        }
      } catch (error) {
        console.error('Error duplicating character:', error);
        // TODO: Show error toast notification
        return false;
      } finally {
        setIsDuplicating(false);
      }
    },
  };

  const formActions = {
    openCreationForm: () => setIsCreationFormOpen(true),
    closeCreationForm: () => setIsCreationFormOpen(false),

    handleCreationSuccess: (character: any) => {
      setIsCreationFormOpen(false);
      if (character?._id) {
        router.push(`/characters/${character._id.toString()}`);
      }
    },
  };

  return {
    isCreationFormOpen,
    isDeleting,
    isDuplicating,
    ConfirmationDialog,
    ...navigationActions,
    ...characterActions,
    ...formActions,
  };
}