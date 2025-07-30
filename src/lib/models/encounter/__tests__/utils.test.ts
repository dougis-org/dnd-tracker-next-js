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

describe('Encounter Utils', () => {
  describe('sortInitiativeOrder', () => {
    const createInitiativeEntries = (configs: Array<{ initiative: number; dexterity: number }>) =>
      configs.map(config => createTestInitiativeEntry(config));

    it('should sort by initiative descending', () => {
      const entries = createInitiativeEntries([
        { initiative: 10, dexterity: 15 },
        { initiative: 20, dexterity: 12 },
        { initiative: 15, dexterity: 18 }
      ]);

      const sorted = sortInitiativeOrder(entries);
      expect(sorted.map(e => e.initiative)).toEqual([20, 15, 10]);
    });

    it('should use dexterity as tiebreaker', () => {
      const entries = createInitiativeEntries([
        { initiative: 15, dexterity: 12 },
        { initiative: 15, dexterity: 18 }
      ]);

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
    const difficultyTests = [
      { players: 4, total: 5, expected: 'trivial', description: 'low enemy ratio' },
      { players: 4, total: 8, expected: 'easy', description: 'balanced encounter' },
      { players: 4, total: 14, expected: 'deadly', description: 'overwhelming enemies' },
      { players: 0, total: 5, expected: 'deadly', description: 'zero players gracefully' }
    ];

    difficultyTests.forEach(({ players, total, expected, description }) => {
      it(`should return ${expected} for ${description}`, () => {
        expect(calculateEncounterDifficulty(players, total)).toBe(expected);
      });
    });
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
    const damageScenarios = [
      { damage: 15, description: 'apply damage to temporary HP first', tempHP: 5, currentHP: 80 },
      { damage: 30, description: 'apply overflow damage to current HP', tempHP: 0, currentHP: 70 },
      { damage: 150, description: 'not reduce HP below 0', tempHP: 0, currentHP: 0 }
    ];

    damageScenarios.forEach(({ damage, description, tempHP, currentHP }) => {
      it(`should ${description}`, () => {
        const participant = createTestParticipant({ temporaryHitPoints: 20 });

        const result = applyDamageToParticipant(participant, damage);
        expect(result).toBe(true);
        expect(participant.temporaryHitPoints).toBe(tempHP);
        expect(participant.currentHitPoints).toBe(currentHP);
      });
    });

    it('should reject negative damage', () => {
      const participant = createTestParticipant({ temporaryHitPoints: 20 });
      expect(applyDamageToParticipant(participant, -5)).toBe(false);
    });
  });

  describe('healParticipant', () => {
    const healingScenarios = [
      { healing: 30, description: 'heal participant up to max HP', expectedHP: 80 },
      { healing: 80, description: 'not heal above max HP', expectedHP: 100 }
    ];

    healingScenarios.forEach(({ healing, description, expectedHP }) => {
      it(`should ${description}`, () => {
        const participant = createTestParticipant({ currentHitPoints: 50 });

        const result = healParticipant(participant, healing);
        expect(result).toBe(true);
        expect(participant.currentHitPoints).toBe(expectedHP);
      });
    });

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

    const durationTests = [
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

    durationTests.forEach(({ start, end, pause, expected, description }) => {
      it(`should ${description}`, () => {
        const startTime = createTestDate(start);
        const endTime = createTestDate(end);
        const pauseTime = pause ? createTestDate(pause) : undefined;

        const duration = calculateCombatDuration(startTime, endTime, pauseTime);
        expect(duration).toBe(expected);
      });
    });
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
    const validationTests = [
      {
        input: { currentHitPoints: 150, temporaryHitPoints: 0 },
        expected: { currentHitPoints: 100 },
        description: 'cap current HP at maximum'
      },
      {
        input: { currentHitPoints: 100, temporaryHitPoints: -10 },
        expected: { temporaryHitPoints: 0 },
        description: 'ensure temporary HP is not negative'
      }
    ];

    validationTests.forEach(({ input, expected, description }) => {
      it(`should ${description}`, () => {
        const participant = createTestParticipant(input);

        validateParticipantHP(participant);
        Object.entries(expected).forEach(([key, value]) => {
          expect(participant[key as keyof typeof participant]).toBe(value);
        });
      });
    });
  });
});
