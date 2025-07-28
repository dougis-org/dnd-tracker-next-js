import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'resuming combat',
    validatePaused: true
  },
  async (encounter, _userId) => {
    encounter.combatState.pausedAt = undefined;
    return true;
  }
);