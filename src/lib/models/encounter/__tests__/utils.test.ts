import {
  sortInitiativeOrder,
  rollInitiative,
  calculateEncounterDifficulty,
  findParticipantById,
  applyDamageToParticipant,
  healParticipant,
  addConditionToParticipant,
  removeConditionFromParticipant,
  calculateCombatDuration,
  createDefaultEncounterSettings,
  createDefaultCombatState,
  validateParticipantHP,
} from '../utils';
import { Types } from 'mongoose';
import {
  createTestParticipant,
  createTestInitiativeEntry,
} from './test-helpers';
import {
  runParameterizedTests,
  createValidationTests,
} from '../../../__tests__/shared-test-helpers';

describe('Encounter Utils', () => {
  describe('sortInitiativeOrder', () => {
    it('should sort by initiative descending', () => {
      const entries = [
        createTestInitiativeEntry({ initiative: 10, dexterity: 15 }),
        createTestInitiativeEntry({ initiative: 20, dexterity: 12 }),
        createTestInitiativeEntry({ initiative: 15, dexterity: 18 })
      ];

      const sorted = sortInitiativeOrder(entries);
      expect(sorted.map(e => e.initiative)).toEqual([20, 15, 10]);
    });

    it('should use dexterity as tiebreaker', () => {
      const entries = [
        createTestInitiativeEntry({ initiative: 15, dexterity: 12 }),
        createTestInitiativeEntry({ initiative: 15, dexterity: 18 })
      ];

      const sorted = sortInitiativeOrder(entries);
      expect(sorted.map(e => e.dexterity)).toEqual([18, 12]);
    });
  });

  describe('rollInitiative', () => {
    it('should return a value between 1 and 20', () => {
      const rolls = Array.from({ length: 100 }, () => rollInitiative());
      rolls.forEach(roll => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('calculateEncounterDifficulty', () => {
    const difficultyTestCases = [
      { players: 4, total: 5, expected: 'trivial', description: 'low enemy ratio' },
      { players: 4, total: 8, expected: 'easy', description: 'balanced encounter' },
      { players: 4, total: 14, expected: 'deadly', description: 'overwhelming enemies' },
      { players: 0, total: 5, expected: 'deadly', description: 'zero players gracefully' }
    ];

    runParameterizedTests(
      'calculateEncounterDifficulty',
      difficultyTestCases,
      ({ players, total, expected }) => {
        expect(calculateEncounterDifficulty(players, total)).toBe(expected);
      },
      ({ description, expected }) => `should return ${expected} for ${description}`
    );
  });

  describe('findParticipantById', () => {
    const testCharacterId = '507f1f77bcf86cd799439013';

    it('should find participant by ID', () => {
      const participants = [createTestParticipant({ characterId: new Types.ObjectId(testCharacterId) })];

      const found = findParticipantById(participants, testCharacterId);
      expect(found).toBeTruthy();
      expect(found?.name).toBe('Test Character');
    });

    it('should return null for non-existent ID', () => {
      const found = findParticipantById([], '507f1f77bcf86cd799439999');
      expect(found).toBeNull();
    });
  });

  describe('applyDamageToParticipant', () => {
    const damageTestCases = [
      { damage: 15, expectedTempHP: 5, expectedCurrentHP: 80, description: 'apply damage to temporary HP first' },
      { damage: 30, expectedTempHP: 0, expectedCurrentHP: 70, description: 'apply overflow damage to current HP' },
      { damage: 150, expectedTempHP: 0, expectedCurrentHP: 0, description: 'not reduce HP below 0' }
    ];

    runParameterizedTests(
      'applyDamageToParticipant',
      damageTestCases,
      ({ damage, expectedTempHP, expectedCurrentHP }) => {
        const participant = createTestParticipant({ temporaryHitPoints: 20 });
        const result = applyDamageToParticipant(participant, damage);

        expect(result).toBe(true);
        expect(participant.temporaryHitPoints).toBe(expectedTempHP);
        expect(participant.currentHitPoints).toBe(expectedCurrentHP);
      },
      ({ description }) => `should ${description}`
    );

    it('should reject negative damage', () => {
      const participant = createTestParticipant({ temporaryHitPoints: 20 });
      expect(applyDamageToParticipant(participant, -5)).toBe(false);
    });
  });

  describe('healParticipant', () => {
    const healingTestCases = [
      { healing: 30, expectedHP: 80, description: 'heal participant up to max HP' },
      { healing: 80, expectedHP: 100, description: 'not heal above max HP' }
    ];

    runParameterizedTests(
      'healParticipant',
      healingTestCases,
      ({ healing, expectedHP }) => {
        const participant = createTestParticipant({ currentHitPoints: 50 });
        const result = healParticipant(participant, healing);

        expect(result).toBe(true);
        expect(participant.currentHitPoints).toBe(expectedHP);
      },
      ({ description }) => `should ${description}`
    );

    it('should reject negative healing', () => {
      const participant = createTestParticipant({ currentHitPoints: 50 });
      expect(healParticipant(participant, -10)).toBe(false);
    });
  });

  describe('condition management', () => {
    describe('addConditionToParticipant', () => {
      it('should add new condition', () => {
        const participant = createTestParticipant({ conditions: ['poisoned'] });

        const result = addConditionToParticipant(participant, 'stunned');
        expect(result).toBe(true);
        expect(participant.conditions).toContain('stunned');
      });

      it('should not add duplicate condition', () => {
        const participant = createTestParticipant({ conditions: ['poisoned'] });

        const result = addConditionToParticipant(participant, 'poisoned');
        expect(result).toBe(false);
        expect(participant.conditions.filter(c => c === 'poisoned')).toHaveLength(1);
      });
    });

    describe('removeConditionFromParticipant', () => {
      it('should remove existing condition', () => {
        const participant = createTestParticipant({ conditions: ['poisoned'] });

        const result = removeConditionFromParticipant(participant, 'poisoned');
        expect(result).toBe(true);
        expect(participant.conditions).not.toContain('poisoned');
      });

      it('should return false for non-existent condition', () => {
        const participant = createTestParticipant({ conditions: ['poisoned'] });

        const result = removeConditionFromParticipant(participant, 'stunned');
        expect(result).toBe(false);
      });
    });
  });

  describe('calculateCombatDuration', () => {
    const createTestDate = (timeStr: string) => new Date(`2023-01-01T${timeStr}:00Z`);

    const durationTestCases = [
      {
        start: '10:00', end: '10:30', pause: undefined,
        expected: 30 * 60 * 1000, description: 'calculate duration without pause'
      },
      {
        start: '10:00', end: '10:30', pause: '10:10',
        expected: 20 * 60 * 1000, description: 'account for pause time'
      },
      {
        start: '10:30', end: '10:00', pause: undefined,
        expected: 0, description: 'not return negative duration'
      }
    ];

    runParameterizedTests(
      'calculateCombatDuration',
      durationTestCases,
      ({ start, end, pause, expected }) => {
        const startTime = createTestDate(start);
        const endTime = createTestDate(end);
        const pauseTime = pause ? createTestDate(pause) : undefined;

        const duration = calculateCombatDuration(startTime, endTime, pauseTime);
        expect(duration).toBe(expected);
      },
      ({ description }) => `should ${description}`
    );
  });

  describe('createDefaultEncounterSettings', () => {
    it('should return default settings', () => {
      const expectedSettings = {
        allowPlayerVisibility: true,
        autoRollInitiative: false,
        trackResources: true,
        enableLairActions: false,
        enableGridMovement: false,
        gridSize: 5
      };

      expect(createDefaultEncounterSettings()).toEqual(expectedSettings);
    });
  });

  describe('createDefaultCombatState', () => {
    it('should return default combat state', () => {
      const expectedState = {
        isActive: false,
        currentRound: 0,
        currentTurn: 0,
        initiativeOrder: [],
        totalDuration: 0
      };

      expect(createDefaultCombatState()).toEqual(expectedState);
    });
  });

  describe('validateParticipantHP', () => {
    const hpValidationCases = [
      {
        input: { currentHitPoints: 150, temporaryHitPoints: 0 },
        expected: true,
        description: 'cap current HP at maximum'
      },
      {
        input: { currentHitPoints: 100, temporaryHitPoints: -10 },
        expected: true,
        description: 'ensure temporary HP is not negative'
      }
    ];

    createValidationTests(
      hpValidationCases,
      ({ currentHitPoints, temporaryHitPoints }) => {
        const participant = createTestParticipant({ currentHitPoints, temporaryHitPoints });
        validateParticipantHP(participant);
        return participant.currentHitPoints <= 100 && participant.temporaryHitPoints >= 0;
      }
    );
  });
});