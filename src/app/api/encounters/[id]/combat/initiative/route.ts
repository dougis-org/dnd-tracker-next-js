import { setInitiative } from '@/lib/models/encounter/methods';
import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'updating initiative',
    requiredFields: ['participantId', 'initiative', 'dexterity']
  },
  async (encounter, _userId, body) => {
    return setInitiative(encounter, body.participantId, body.initiative, body.dexterity);
  }
);