import { withCombatValidation } from '../api-wrapper';

export const PATCH = withCombatValidation(
  {
    operation: 'delaying action',
    requiredFields: ['participantId'],
    findParticipant: true
  },
  async (encounter, _userId, body, participant) => {
    participant.isDelayed = true;
    return true;
  }
);