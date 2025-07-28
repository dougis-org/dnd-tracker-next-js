import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'pausing combat',
    validateNotPaused: true
  },
  async (encounter, _userId) => {
    encounter.combatState.pausedAt = new Date();
    return true;
  }
);