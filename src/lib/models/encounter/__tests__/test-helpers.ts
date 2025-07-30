import { Types } from 'mongoose';
import { IParticipantReference, IInitiativeEntry } from '../interfaces';

/**
 * Shared test helper functions to eliminate code duplication
 */

const DEFAULT_PARTICIPANT_CONFIG = {
  characterId: new Types.ObjectId('507f1f77bcf86cd799439011'),
  name: 'Test Character',
  type: 'pc' as const,
  maxHitPoints: 100,
  currentHitPoints: 80,
  temporaryHitPoints: 0,
  armorClass: 15,
  isPlayer: true,
  isVisible: true,
  notes: '',
  conditions: [],
};

const DEFAULT_INITIATIVE_CONFIG = {
  participantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
  initiative: 15,
  dexterity: 14,
  isActive: false,
  hasActed: false,
};

export const createTestParticipant = (
  overrides?: Partial<IParticipantReference>
): IParticipantReference => ({
  ...DEFAULT_PARTICIPANT_CONFIG,
  ...overrides,
});

export const createTestInitiativeEntry = (
  overrides?: Partial<IInitiativeEntry>
): IInitiativeEntry => ({
  ...DEFAULT_INITIATIVE_CONFIG,
  ...overrides,
});

export const createMockConstructorSetup = () => {
  const mockInstance = {
    save: jest.fn().mockResolvedValue(true),
  };
  const MockConstructor = jest.fn().mockReturnValue(mockInstance);
  return { mockInstance, MockConstructor };
};
