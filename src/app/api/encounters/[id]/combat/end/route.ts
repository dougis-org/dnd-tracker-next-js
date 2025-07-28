import { endCombat } from '@/lib/models/encounter/methods';
import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'ending combat'
  },
  async (encounter, _userId) => {
    endCombat(encounter);
    return true;
  }
);