import { nextTurn } from '@/lib/models/encounter/methods';
import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'advancing turn',
    validateNotPaused: true
  },
  async (encounter, _userId) => {
    return nextTurn(encounter);
  }
);