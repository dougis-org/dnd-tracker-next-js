import { previousTurn } from '@/lib/models/encounter/methods';
import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'going to previous turn',
    validateTurnHistory: true
  },
  async (encounter, _userId) => {
    return previousTurn(encounter);
  }
);