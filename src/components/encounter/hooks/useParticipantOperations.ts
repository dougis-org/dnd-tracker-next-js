import { useCallback, useState } from 'react';
import { Types } from 'mongoose';
import { EncounterService } from '@/lib/services/EncounterService';
import type { IEncounter } from '@/lib/models/encounter/interfaces';
import { handleServiceOperation } from '../utils/serviceOperationUtils';
import { convertCharactersToParticipantData } from '../utils/characterConversion';
import type { Character } from '@/lib/validations/character';

interface ParticipantFormData {
  name: string;
  type: 'pc' | 'npc' | 'monster';
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  armorClass: number;
  initiative?: number;
  isPlayer: boolean;
  isVisible: boolean;
  notes: string;
  conditions: string[];
}

export const useParticipantOperations = (
  encounter: IEncounter,
  onUpdate?: (_updatedEncounter: IEncounter) => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const createParticipantData = useCallback((data: ParticipantFormData) => ({
    ...data,
    characterId: new Types.ObjectId().toString(),
    currentHitPoints: data.maxHitPoints,
  }), []);

  const executeWithLoading = useCallback(async (operation: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await operation();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeServiceOperation = useCallback(async (
    operation: () => Promise<any>,
    successMessage: string,
    onSuccess?: (_data: any) => void
  ) => {
    await executeWithLoading(async () => {
      await handleServiceOperation(
        operation,
        successMessage,
        (data?: IEncounter) => {
          if (data) {
            onUpdate?.(data);
            onSuccess?.(data);
          }
        }
      );
    });
  }, [executeWithLoading, onUpdate]);

  const addParticipant = useCallback(async (
    formData: ParticipantFormData,
    onSuccess: () => void
  ) => {
    const participantData = createParticipantData(formData);
    await executeServiceOperation(
      () => EncounterService.addParticipant(encounter._id.toString(), participantData),
      'Participant added successfully',
      () => onSuccess()
    );
  }, [encounter._id, createParticipantData, executeServiceOperation]);

  const updateParticipant = useCallback(async (
    participantId: string,
    formData: ParticipantFormData,
    onSuccess: () => void
  ) => {
    // For updates, don't include characterId as it shouldn't be changed
    const { characterId: _characterId, ...updateData } = createParticipantData(formData);
    await executeServiceOperation(
      () => EncounterService.updateParticipant(encounter._id.toString(), participantId, updateData),
      'Participant updated successfully',
      () => onSuccess()
    );
  }, [encounter._id, createParticipantData, executeServiceOperation]);

  const removeParticipant = useCallback(async (participantId: string) => {
    await executeServiceOperation(
      () => EncounterService.removeParticipant(encounter._id.toString(), participantId),
      'Participant removed successfully'
    );
  }, [encounter._id, executeServiceOperation]);

  const reorderParticipants = useCallback(async (participantIds: string[]) => {
    await executeServiceOperation(
      () => EncounterService.reorderParticipants(encounter._id.toString(), participantIds),
      'Participants reordered successfully'
    );
  }, [encounter._id, executeServiceOperation]);

  const importParticipants = useCallback(async (
    characters: Character[],
    onSuccess?: () => void
  ) => {
    // Convert characters to participant format
    const participants = convertCharactersToParticipantData(characters);

    await executeServiceOperation(
      () => EncounterService.addParticipantsBulk(encounter._id.toString(), participants),
      `${participants.length} participants imported successfully`,
      () => onSuccess?.()
    );
  }, [encounter._id, executeServiceOperation]);

  return {
    isLoading,
    addParticipant,
    updateParticipant,
    removeParticipant,
    reorderParticipants,
    importParticipants,
  };
};