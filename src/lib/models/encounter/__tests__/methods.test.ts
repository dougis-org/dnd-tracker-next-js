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
import { createTestParticipant } from './test-helpers';
import { runParameterizedTests } from '../../../__tests__/shared-test-helpers';

// Extracted test data constants
const TEST_CHARACTER_IDS = {
  participant1: '507f1f77bcf86cd799439011',
  participant2: '507f1f77bcf86cd799439012',
  participant3: '507f1f77bcf86cd799439013',
  participant4: '507f1f77bcf86cd799439014',
};

// Simplified encounter factory
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

  // Bind all methods in a single operation
  const methods = {
    addParticipant, removeParticipant, updateParticipant, getParticipant,
    startCombat, endCombat, nextTurn, previousTurn, setInitiative,
    applyDamage, applyHealing, addCondition, removeCondition,
    getInitiativeOrder, calculateDifficulty, duplicateEncounter, toSummary,
  };

  Object.entries(methods).forEach(([name, method]) => {
    (mockEncounter as any)[name] = method.bind(mockEncounter);
  });

  return mockEncounter as IEncounter;
};

// Simplified state factories
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

// Simplified combat state setup
const setupCombatWithInitiative = (encounter: IEncounter) => {
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
      const removeParticipantTestCases = [
        {
          setup: () => {
            const charId = TEST_CHARACTER_IDS.participant1;
            encounter.participants = [createTestParticipant({
              characterId: new Types.ObjectId(charId)
            })];
            return charId;
          },
          expected: { result: true, participantCount: 0 },
          description: 'remove existing participant'
        },
        {
          setup: () => new Types.ObjectId().toString(),
          expected: { result: false, participantCount: 0 },
          description: 'return false for non-existent participant'
        }
      ];

      runParameterizedTests(
        'removeParticipant',
        removeParticipantTestCases,
        ({ setup, expected }) => {
          const characterId = setup();
          const result = removeParticipant(encounter, characterId);
          expect(result).toBe(expected.result);
          expect(encounter.participants).toHaveLength(expected.participantCount);
        },
        ({ description }) => `should ${description}`
      );

      it('should remove from initiative order and adjust current turn', () => {
        const charId = TEST_CHARACTER_IDS.participant2;
        encounter.participants = [createTestParticipant({
          characterId: new Types.ObjectId(charId)
        })];
        encounter.combatState.initiativeOrder = [{
          participantId: new Types.ObjectId(charId),
          initiative: 15,
          dexterity: 14,
          isActive: false,
          hasActed: false,
        }];
        encounter.combatState.currentTurn = 1;

        removeParticipant(encounter, charId);
        expect(encounter.combatState.initiativeOrder).toHaveLength(0);
        expect(encounter.combatState.currentTurn).toBe(0);
      });
    });

    describe('updateParticipant', () => {
      const updateTestCases = [
        {
          setup: () => {
            const charId = TEST_CHARACTER_IDS.participant3;
            const participant = createTestParticipant({
              characterId: new Types.ObjectId(charId)
            });
            encounter.participants = [participant];
            return { charId, updates: { currentHitPoints: 50 } };
          },
          expected: { result: true, finalHP: 50 },
          description: 'update existing participant'
        },
        {
          setup: () => ({
            charId: new Types.ObjectId().toString(),
            updates: { currentHitPoints: 50 }
          }),
          expected: { result: false, finalHP: undefined },
          description: 'return false for non-existent participant'
        }
      ];

      runParameterizedTests(
        'updateParticipant',
        updateTestCases,
        ({ setup, expected }) => {
          const { charId, updates } = setup();
          const result = updateParticipant(encounter, charId, updates);
          expect(result).toBe(expected.result);
          if (expected.finalHP !== undefined) {
            expect(encounter.participants[0].currentHitPoints).toBe(expected.finalHP);
          }
        },
        ({ description }) => `should ${description}`
      );
    });

    describe('getParticipant', () => {
      it('should return participant if found', () => {
        const charId = TEST_CHARACTER_IDS.participant4;
        const participant = createTestParticipant({
          characterId: new Types.ObjectId(charId)
        });
        encounter.participants = [participant];

        const result = getParticipant(encounter, charId);
        expect(result).toBe(participant);
      });

      it('should return null for non-existent participant', () => {
        const result = getParticipant(encounter, new Types.ObjectId().toString());
        expect(result).toBeNull();
      });
    });
  });

  describe('Combat Management', () => {
    describe('startCombat', () => {
      it('should activate combat state', () => {
        startCombat(encounter);
        expect(encounter.combatState.isActive).toBe(true);
        expect(encounter.combatState.currentRound).toBe(1);
      });
    });

    describe('endCombat', () => {
      it('should deactivate combat state', () => {
        encounter.combatState.isActive = true;
        endCombat(encounter);
        expect(encounter.combatState.isActive).toBe(false);
      });
    });

    describe('nextTurn', () => {
      it('should advance to next turn', () => {
        setupCombatWithInitiative(encounter);
        nextTurn(encounter);
        expect(encounter.combatState.currentTurn).toBe(1);
      });
    });

    describe('previousTurn', () => {
      it('should go to previous turn', () => {
        setupCombatWithInitiative(encounter);
        encounter.combatState.currentTurn = 1;
        previousTurn(encounter);
        expect(encounter.combatState.currentTurn).toBe(0);
      });
    });
  });

  describe('Health Management', () => {
    const healthTestCases = [
      {
        method: 'applyDamage',
        amount: 25,
        initialHP: 100,
        expectedHP: 75,
        description: 'apply damage to participant'
      },
      {
        method: 'applyHealing',
        amount: 25,
        initialHP: 50,
        expectedHP: 75,
        description: 'apply healing to participant'
      }
    ];

    runParameterizedTests(
      'health management',
      healthTestCases,
      ({ method, amount, initialHP, expectedHP }) => {
        const charId = TEST_CHARACTER_IDS.participant1;
        const participant = createTestParticipant({
          characterId: new Types.ObjectId(charId),
          currentHitPoints: initialHP
        });
        encounter.participants = [participant];

        const methodFn = method === 'applyDamage' ? applyDamage : applyHealing;
        const result = methodFn(encounter, charId, amount);

        expect(result).toBe(true);
        expect(participant.currentHitPoints).toBe(expectedHP);
      },
      ({ description }) => `should ${description}`
    );
  });

  describe('Condition Management', () => {
    const conditionTestCases = [
      {
        method: 'addCondition',
        condition: 'poisoned',
        initialConditions: [],
        expectedConditions: ['poisoned'],
        expectedResult: true,
        description: 'add new condition'
      },
      {
        method: 'removeCondition',
        condition: 'poisoned',
        initialConditions: ['poisoned'],
        expectedConditions: [],
        expectedResult: true,
        description: 'remove existing condition'
      },
      {
        method: 'removeCondition',
        condition: 'stunned',
        initialConditions: ['poisoned'],
        expectedConditions: ['poisoned'],
        expectedResult: false,
        description: 'return false when removing non-existent condition'
      }
    ];

    runParameterizedTests(
      'condition management',
      conditionTestCases,
      ({ method, condition, initialConditions, expectedConditions, expectedResult }) => {
        const charId = TEST_CHARACTER_IDS.participant1;
        const participant = createTestParticipant({
          characterId: new Types.ObjectId(charId),
          conditions: [...initialConditions]
        });
        encounter.participants = [participant];

        const methodFn = method === 'addCondition' ? addCondition : removeCondition;
        const result = methodFn(encounter, charId, condition);

        expect(result).toBe(expectedResult);
        expect(participant.conditions).toEqual(expectedConditions);
      },
      ({ description }) => `should ${description}`
    );
  });

  describe('Utility Methods', () => {
    it('should get initiative order', () => {
      setupCombatWithInitiative(encounter);
      const order = getInitiativeOrder(encounter);
      expect(order).toHaveLength(2);
      expect(order[0].initiative).toBe(20);
    });

    it('should calculate difficulty', () => {
      const difficulty = calculateDifficulty(encounter);
      expect(typeof difficulty).toBe('string');
    });

    it('should duplicate encounter', () => {
      const duplicate = duplicateEncounter(encounter);
      expect(duplicate).toBeTruthy();
    });

    it('should create summary', () => {
      const summary = toSummary(encounter);
      expect(summary).toHaveProperty('name');
      expect(summary).toHaveProperty('participantCount');
    });
  });
});