import { Types } from 'mongoose';
import {
  addParticipant,
  removeParticipant,
  updateParticipant,
  getParticipant,
  startCombat,
  endCombat,
  nextTurn,
  previousTurn,
  setInitiative,
  applyDamage,
  applyHealing,
  addCondition,
  removeCondition,
  getInitiativeOrder,
  calculateDifficulty,
  duplicateEncounter,
  toSummary,
} from '../methods';
import { IEncounter } from '../interfaces';
import { createTestParticipant, createMockConstructorSetup } from './test-helpers';

// Base mock encounter
const createMockEncounter = (): IEncounter => {
  const mockEncounter = {
    _id: new Types.ObjectId(),
    ownerId: new Types.ObjectId(),
    name: 'Test Encounter',
    description: 'Test description',
    tags: [],
    difficulty: 'medium' as const,
    estimatedDuration: 60,
    targetLevel: 5,
    status: 'draft' as const,
    participants: [],
    combatState: createDefaultCombatState(),
    settings: createDefaultSettings(),
    isPublic: false,
    participantCount: 0,
    playerCount: 0,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    toObject: jest.fn().mockReturnValue({}),
    constructor: jest.fn(),
  };

  // Bind methods to encounter
  Object.assign(mockEncounter, {
    addParticipant: addParticipant.bind(mockEncounter),
    removeParticipant: removeParticipant.bind(mockEncounter),
    updateParticipant: updateParticipant.bind(mockEncounter),
    getParticipant: getParticipant.bind(mockEncounter),
    startCombat: startCombat.bind(mockEncounter),
    endCombat: endCombat.bind(mockEncounter),
    nextTurn: nextTurn.bind(mockEncounter),
    previousTurn: previousTurn.bind(mockEncounter),
    setInitiative: setInitiative.bind(mockEncounter),
    applyDamage: applyDamage.bind(mockEncounter),
    applyHealing: applyHealing.bind(mockEncounter),
    addCondition: addCondition.bind(mockEncounter),
    removeCondition: removeCondition.bind(mockEncounter),
    getInitiativeOrder: getInitiativeOrder.bind(mockEncounter),
    calculateDifficulty: calculateDifficulty.bind(mockEncounter),
    duplicateEncounter: duplicateEncounter.bind(mockEncounter),
    toSummary: toSummary.bind(mockEncounter),
  });

  return mockEncounter as IEncounter;
};

const createDefaultCombatState = () => ({
  isActive: false,
  currentRound: 0,
  currentTurn: 0,
  initiativeOrder: [],
  totalDuration: 0,
});

const createDefaultSettings = () => ({
  allowPlayerVisibility: true,
  autoRollInitiative: false,
  trackResources: true,
  enableLairActions: false,
  enableGridMovement: false,
  gridSize: 5,
});

const createParticipantData = (characterIdString?: string) => ({
  characterId: characterIdString || new Types.ObjectId().toString(),
  name: 'Test Character',
  type: 'pc' as const,
  maxHitPoints: 100,
  currentHitPoints: 100,
  temporaryHitPoints: 0,
  armorClass: 15,
  isPlayer: true,
  isVisible: true,
  notes: '',
  conditions: [],
});

const setupCombatState = (encounter: IEncounter) => {
  encounter.combatState.isActive = true;
  encounter.combatState.initiativeOrder = [
    {
      participantId: new Types.ObjectId(),
      initiative: 20,
      dexterity: 15,
      isActive: true,
      hasActed: false,
    },
    {
      participantId: new Types.ObjectId(),
      initiative: 15,
      dexterity: 12,
      isActive: false,
      hasActed: false,
    },
  ];
};

describe('Encounter Methods', () => {
  let encounter: IEncounter;

  beforeEach(() => {
    encounter = createMockEncounter();
  });

  describe('Participant Management', () => {
    describe('addParticipant', () => {
      it('should add participant to encounter', () => {
        const participantData = createParticipantData();
        addParticipant(encounter, participantData);
        expect(encounter.participants).toHaveLength(1);
        expect(encounter.participants[0].name).toBe('Test Character');
      });
    });

    describe('removeParticipant', () => {
      it('should remove participant and return true', () => {
        const characterIdString = '507f1f77bcf86cd799439011';
        encounter.participants = [createTestParticipant({ characterId: new Types.ObjectId(characterIdString) })];

        const result = removeParticipant(encounter, characterIdString);
        expect(result).toBe(true);
        expect(encounter.participants).toHaveLength(0);
      });

      it('should return false for non-existent participant', () => {
        const result = removeParticipant(encounter, new Types.ObjectId().toString());
        expect(result).toBe(false);
      });

      it('should remove from initiative order and adjust current turn', () => {
        const characterIdString = '507f1f77bcf86cd799439012';
        encounter.participants = [createTestParticipant({ characterId: new Types.ObjectId(characterIdString) })];
        encounter.combatState.initiativeOrder = [{
          participantId: new Types.ObjectId(characterIdString),
          initiative: 15,
          dexterity: 14,
          isActive: false,
          hasActed: false,
        }];
        encounter.combatState.currentTurn = 1;

        removeParticipant(encounter, characterIdString);
        expect(encounter.combatState.initiativeOrder).toHaveLength(0);
        expect(encounter.combatState.currentTurn).toBe(0);
      });
    });

    describe('updateParticipant', () => {
      it('should update participant and return true', () => {
        const characterIdString = '507f1f77bcf86cd799439013';
        const participant = createTestParticipant({ characterId: new Types.ObjectId(characterIdString) });
        encounter.participants = [participant];

        const result = updateParticipant(encounter, characterIdString, { currentHitPoints: 50 });
        expect(result).toBe(true);
        expect(participant.currentHitPoints).toBe(50);
      });

      it('should return false for non-existent participant', () => {
        const result = updateParticipant(encounter, new Types.ObjectId().toString(), { currentHitPoints: 50 });
        expect(result).toBe(false);
      });
    });

    describe('getParticipant', () => {
      it('should return participant if found', () => {
        const characterIdString = '507f1f77bcf86cd799439014';
        const participant = createTestParticipant({ characterId: new Types.ObjectId(characterIdString) });
        encounter.participants = [participant];

        const result = getParticipant(encounter, characterIdString);
        expect(result).toBe(participant);
      });

      it('should return null if not found', () => {
        const result = getParticipant(encounter, new Types.ObjectId().toString());
        expect(result).toBeNull();
      });
    });
  });

  describe('Combat Management', () => {
    describe('startCombat', () => {
      it('should initialize combat state', () => {
        encounter.participants = [createTestParticipant()];

        startCombat(encounter);
        expect(encounter.combatState.isActive).toBe(true);
        expect(encounter.combatState.currentRound).toBe(1);
        expect(encounter.combatState.currentTurn).toBe(0);
        expect(encounter.status).toBe('active');
        expect(encounter.combatState.initiativeOrder).toHaveLength(1);
      });

      it('should auto-roll initiative when requested', () => {
        encounter.participants = [createTestParticipant()];

        startCombat(encounter, true);
        const initiative = encounter.combatState.initiativeOrder[0].initiative;
        expect(initiative).toBeGreaterThan(0);
        expect(initiative).toBeLessThanOrEqual(20);
      });

      it('should set first participant as active', () => {
        encounter.participants = [createTestParticipant()];

        startCombat(encounter);
        expect(encounter.combatState.initiativeOrder[0].isActive).toBe(true);
      });
    });

    describe('endCombat', () => {
      it('should end combat and reset states', () => {
        encounter.combatState.isActive = true;
        encounter.combatState.startedAt = new Date();
        encounter.combatState.initiativeOrder = [{
          participantId: new Types.ObjectId(),
          initiative: 15,
          dexterity: 14,
          isActive: true,
          hasActed: true,
        }];

        endCombat(encounter);
        expect(encounter.combatState.isActive).toBe(false);
        expect(encounter.combatState.endedAt).toBeDefined();
        expect(encounter.status).toBe('completed');
        expect(encounter.combatState.initiativeOrder[0].isActive).toBe(false);
        expect(encounter.combatState.initiativeOrder[0].hasActed).toBe(false);
      });
    });

    describe('nextTurn', () => {
      beforeEach(() => {
        setupCombatState(encounter);
      });

      it('should advance to next participant', () => {
        const result = nextTurn(encounter);
        expect(result).toBe(true);
        expect(encounter.combatState.currentTurn).toBe(1);
        expect(encounter.combatState.initiativeOrder[0].hasActed).toBe(true);
        expect(encounter.combatState.initiativeOrder[0].isActive).toBe(false);
        expect(encounter.combatState.initiativeOrder[1].isActive).toBe(true);
      });

      it('should start new round when reaching end', () => {
        encounter.combatState.currentTurn = 1;

        const result = nextTurn(encounter);
        expect(result).toBe(true);
        expect(encounter.combatState.currentTurn).toBe(0);
        expect(encounter.combatState.currentRound).toBe(1);
        expect(encounter.combatState.initiativeOrder[0].hasActed).toBe(false);
        expect(encounter.combatState.initiativeOrder[1].hasActed).toBe(false);
      });

      it('should return false when combat not active', () => {
        encounter.combatState.isActive = false;
        const result = nextTurn(encounter);
        expect(result).toBe(false);
      });
    });

    describe('previousTurn', () => {
      beforeEach(() => {
        encounter.combatState.isActive = true;
        encounter.combatState.currentTurn = 1;
        encounter.combatState.currentRound = 2;
        encounter.combatState.initiativeOrder = [{
          participantId: new Types.ObjectId(),
          initiative: 20,
          dexterity: 15,
          isActive: false,
          hasActed: true,
        }, {
          participantId: new Types.ObjectId(),
          initiative: 15,
          dexterity: 12,
          isActive: true,
          hasActed: false,
        }];
      });

      it('should go back to previous participant', () => {
        const result = previousTurn(encounter);
        expect(result).toBe(true);
        expect(encounter.combatState.currentTurn).toBe(0);
        expect(encounter.combatState.initiativeOrder[1].isActive).toBe(false);
        expect(encounter.combatState.initiativeOrder[0].isActive).toBe(true);
        expect(encounter.combatState.initiativeOrder[0].hasActed).toBe(false);
      });

      it('should go to previous round when at start', () => {
        encounter.combatState.currentTurn = 0;

        const result = previousTurn(encounter);
        expect(result).toBe(true);
        expect(encounter.combatState.currentTurn).toBe(1);
        expect(encounter.combatState.currentRound).toBe(1);
      });

      it('should return false when combat not active', () => {
        encounter.combatState.isActive = false;
        const result = previousTurn(encounter);
        expect(result).toBe(false);
      });
    });
  });

  describe('Initiative and Combat Actions', () => {
    const testParticipantId = '507f1f77bcf86cd799439019';
    const testParticipantObjectId = new Types.ObjectId(testParticipantId);

    describe('setInitiative', () => {
      it('should update initiative and re-sort order', () => {
        encounter.combatState.initiativeOrder = [{
          participantId: testParticipantObjectId,
          initiative: 10,
          dexterity: 12,
          isActive: true,
          hasActed: false,
        }, {
          participantId: new Types.ObjectId('507f1f77bcf86cd799439020'),
          initiative: 15,
          dexterity: 14,
          isActive: false,
          hasActed: false,
        }];

        const result = setInitiative(encounter, testParticipantId, 20, 16);
        expect(result).toBe(true);
        expect(encounter.combatState.initiativeOrder[0].participantId).toEqual(testParticipantObjectId);
        expect(encounter.combatState.initiativeOrder[0].initiative).toBe(20);
      });

      it('should return false for non-existent participant', () => {
        const result = setInitiative(encounter, new Types.ObjectId().toString(), 15, 12);
        expect(result).toBe(false);
      });
    });

    describe('applyDamage', () => {
      it('should apply damage to participant', () => {
        const characterIdString = '507f1f77bcf86cd799439015';
        encounter.participants = [createTestParticipant({ characterId: new Types.ObjectId(characterIdString) })];

        const result = applyDamage(encounter, characterIdString, 20);
        expect(result).toBe(true);
      });

      it('should return false for non-existent participant', () => {
        encounter.participants = [];
        const result = applyDamage(encounter, new Types.ObjectId().toString(), 20);
        expect(result).toBe(false);
      });
    });

    describe('applyHealing', () => {
      it('should apply healing to participant', () => {
        const characterIdString = '507f1f77bcf86cd799439016';
        encounter.participants = [createTestParticipant({ characterId: new Types.ObjectId(characterIdString) })];

        const result = applyHealing(encounter, characterIdString, 20);
        expect(result).toBe(true);
      });

      it('should return false for non-existent participant', () => {
        encounter.participants = [];
        const result = applyHealing(encounter, new Types.ObjectId().toString(), 20);
        expect(result).toBe(false);
      });
    });

    describe('addCondition', () => {
      it('should add condition to participant', () => {
        const characterIdString = '507f1f77bcf86cd799439017';
        encounter.participants = [createTestParticipant({ characterId: new Types.ObjectId(characterIdString) })];

        const result = addCondition(encounter, characterIdString, 'poisoned');
        expect(result).toBe(true);
      });

      it('should return false for non-existent participant', () => {
        encounter.participants = [];
        const result = addCondition(encounter, new Types.ObjectId().toString(), 'poisoned');
        expect(result).toBe(false);
      });
    });

    describe('removeCondition', () => {
      it('should remove condition from participant', () => {
        const characterIdString = '507f1f77bcf86cd799439018';
        const participant = createTestParticipant({
          characterId: new Types.ObjectId(characterIdString),
          conditions: ['poisoned']
        });
        encounter.participants = [participant];

        const result = removeCondition(encounter, characterIdString, 'poisoned');
        expect(result).toBe(true);
      });

      it('should return false for non-existent participant', () => {
        encounter.participants = [];
        const result = removeCondition(encounter, new Types.ObjectId().toString(), 'poisoned');
        expect(result).toBe(false);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getInitiativeOrder', () => {
      it('should return copy of initiative order', () => {
        const initiativeOrder = [{
          participantId: new Types.ObjectId(),
          initiative: 15,
          dexterity: 14,
          isActive: false,
          hasActed: false,
        }];
        encounter.combatState.initiativeOrder = initiativeOrder;

        const result = getInitiativeOrder(encounter);
        expect(result).toEqual(initiativeOrder);
        expect(result).not.toBe(initiativeOrder);
      });
    });

    describe('calculateDifficulty', () => {
      it('should calculate encounter difficulty', () => {
        encounter.playerCount = 4;
        encounter.participants = Array(8).fill(null).map(() => createTestParticipant());

        const result = calculateDifficulty(encounter);
        expect(result).toBe('easy');
      });
    });

    describe('duplicateEncounter', () => {
      it('should create duplicate with reset state', () => {
        const { MockConstructor } = createMockConstructorSetup();
        encounter.toObject = jest.fn().mockReturnValue({
          _id: encounter._id,
          name: encounter.name,
          description: encounter.description,
          status: 'active',
          combatState: { isActive: true },
          version: 2,
        });
        encounter.constructor = MockConstructor;

        duplicateEncounter(encounter, 'New Name');
        expect(MockConstructor).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Name',
            status: 'draft',
            version: 1,
          })
        );
      });

      it('should use default copy name if none provided', () => {
        const { MockConstructor } = createMockConstructorSetup();
        encounter.toObject = jest.fn().mockReturnValue({ name: encounter.name });
        encounter.constructor = MockConstructor;

        duplicateEncounter(encounter);
        expect(MockConstructor).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Test Encounter (Copy)' })
        );
      });
    });

    describe('toSummary', () => {
      it('should return encounter summary', () => {
        const expectedSummary = {
          _id: encounter._id,
          name: encounter.name,
          description: encounter.description,
          tags: encounter.tags,
          difficulty: encounter.difficulty,
          estimatedDuration: encounter.estimatedDuration,
          targetLevel: encounter.targetLevel,
          status: encounter.status,
          isPublic: encounter.isPublic,
          participantCount: encounter.participantCount,
          playerCount: encounter.playerCount,
          isActive: encounter.isActive,
          createdAt: encounter.createdAt,
          updatedAt: encounter.updatedAt,
        };

        const result = toSummary(encounter);
        expect(result).toEqual(expectedSummary);
      });
    });
  });
});
