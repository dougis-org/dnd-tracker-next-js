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
import { IInitiativeEntry, IParticipantReference } from '../interfaces';
import { Types } from 'mongoose';
import {
  createTestParticipant,
  createTestInitiativeEntry,
} from './test-helpers';

describe('Encounter Utils', () => {
  describe('sortInitiativeOrder', () => {
    it('should sort by initiative descending', () => {
      const entries: IInitiativeEntry[] = [
        createTestInitiativeEntry({ initiative: 10, dexterity: 15 }),
        createTestInitiativeEntry({ initiative: 20, dexterity: 12 }),
        createTestInitiativeEntry({ initiative: 15, dexterity: 18 }),
      ];

      const sorted = sortInitiativeOrder(entries);
      expect(sorted[0].initiative).toBe(20);
      expect(sorted[1].initiative).toBe(15);
      expect(sorted[2].initiative).toBe(10);
    });

    it('should use dexterity as tiebreaker', () => {
      const entries: IInitiativeEntry[] = [
        createTestInitiativeEntry({ initiative: 15, dexterity: 12 }),
        createTestInitiativeEntry({ initiative: 15, dexterity: 18 }),
      ];

      const sorted = sortInitiativeOrder(entries);
      expect(sorted[0].dexterity).toBe(18);
      expect(sorted[1].dexterity).toBe(12);
    });
  });

  describe('rollInitiative', () => {
    it('should return a value between 1 and 20', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollInitiative();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('calculateEncounterDifficulty', () => {
    it('should return trivial for low enemy ratio', () => {
      const difficulty = calculateEncounterDifficulty(4, 5); // 1 enemy vs 4 players
      expect(difficulty).toBe('trivial');
    });

    it('should return easy for balanced encounter', () => {
      const difficulty = calculateEncounterDifficulty(4, 8); // 4 enemies vs 4 players
      expect(difficulty).toBe('easy');
    });

    it('should return deadly for overwhelming enemies', () => {
      const difficulty = calculateEncounterDifficulty(4, 14); // 10 enemies vs 4 players
      expect(difficulty).toBe('deadly');
    });

    it('should handle zero players gracefully', () => {
      const difficulty = calculateEncounterDifficulty(0, 5);
      expect(difficulty).toBe('deadly');
    });
  });

  describe('findParticipantById', () => {
    it('should find participant by ID', () => {
      const characterIdString = '507f1f77bcf86cd799439013';
      const characterId = new Types.ObjectId(characterIdString);
      const participants: IParticipantReference[] = [
        createTestParticipant({ characterId }),
      ];

      const found = findParticipantById(participants, characterIdString);
      expect(found).toBeTruthy();
      expect(found?.name).toBe('Test Character');
    });

    it('should return null for non-existent ID', () => {
      const participants: IParticipantReference[] = [];

      const found = findParticipantById(
        participants,
        '507f1f77bcf86cd799439999'
      );
      expect(found).toBeNull();
    });
  });

  describe('applyDamageToParticipant', () => {
    let participant: IParticipantReference;

    beforeEach(() => {
      participant = createTestParticipant({ temporaryHitPoints: 20 });
    });

    it('should apply damage to temporary HP first', () => {
      const result = applyDamageToParticipant(participant, 15);
      expect(result).toBe(true);
      expect(participant.temporaryHitPoints).toBe(5);
      expect(participant.currentHitPoints).toBe(80);
    });

    it('should apply overflow damage to current HP', () => {
      const result = applyDamageToParticipant(participant, 30);
      expect(result).toBe(true);
      expect(participant.temporaryHitPoints).toBe(0);
      expect(participant.currentHitPoints).toBe(70);
    });

    it('should not reduce HP below 0', () => {
      const result = applyDamageToParticipant(participant, 150);
      expect(result).toBe(true);
      expect(participant.currentHitPoints).toBe(0);
    });

    it('should reject negative damage', () => {
      const result = applyDamageToParticipant(participant, -5);
      expect(result).toBe(false);
    });
  });

  describe('healParticipant', () => {
    let participant: IParticipantReference;

    beforeEach(() => {
      participant = createTestParticipant({ currentHitPoints: 50 });
    });

    it('should heal participant up to max HP', () => {
      const result = healParticipant(participant, 30);
      expect(result).toBe(true);
      expect(participant.currentHitPoints).toBe(80);
    });

    it('should not heal above max HP', () => {
      const result = healParticipant(participant, 80);
      expect(result).toBe(true);
      expect(participant.currentHitPoints).toBe(100);
    });

    it('should reject negative healing', () => {
      const result = healParticipant(participant, -10);
      expect(result).toBe(false);
    });
  });

  describe('condition management', () => {
    let participant: IParticipantReference;

    beforeEach(() => {
      participant = createTestParticipant({
        currentHitPoints: 100,
        conditions: ['poisoned'],
      });
    });

    describe('addConditionToParticipant', () => {
      it('should add new condition', () => {
        const result = addConditionToParticipant(participant, 'stunned');
        expect(result).toBe(true);
        expect(participant.conditions).toContain('stunned');
      });

      it('should not add duplicate condition', () => {
        const result = addConditionToParticipant(participant, 'poisoned');
        expect(result).toBe(false);
        expect(
          participant.conditions.filter(c => c === 'poisoned')
        ).toHaveLength(1);
      });
    });

    describe('removeConditionFromParticipant', () => {
      it('should remove existing condition', () => {
        const result = removeConditionFromParticipant(participant, 'poisoned');
        expect(result).toBe(true);
        expect(participant.conditions).not.toContain('poisoned');
      });

      it('should return false for non-existent condition', () => {
        const result = removeConditionFromParticipant(participant, 'stunned');
        expect(result).toBe(false);
      });
    });
  });

  describe('calculateCombatDuration', () => {
    it('should calculate duration without pause', () => {
      const startTime = new Date('2023-01-01T10:00:00Z');
      const endTime = new Date('2023-01-01T10:30:00Z');

      const duration = calculateCombatDuration(startTime, endTime);
      expect(duration).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });

    it('should account for pause time', () => {
      const startTime = new Date('2023-01-01T10:00:00Z');
      const endTime = new Date('2023-01-01T10:30:00Z');
      const pauseTime = new Date('2023-01-01T10:10:00Z');

      const duration = calculateCombatDuration(startTime, endTime, pauseTime);
      expect(duration).toBe(20 * 60 * 1000); // 20 minutes in milliseconds
    });

    it('should not return negative duration', () => {
      const startTime = new Date('2023-01-01T10:30:00Z');
      const endTime = new Date('2023-01-01T10:00:00Z');

      const duration = calculateCombatDuration(startTime, endTime);
      expect(duration).toBe(0);
    });
  });

  describe('createDefaultEncounterSettings', () => {
    it('should return default settings', () => {
      const settings = createDefaultEncounterSettings();
      expect(settings.allowPlayerVisibility).toBe(true);
      expect(settings.autoRollInitiative).toBe(false);
      expect(settings.trackResources).toBe(true);
      expect(settings.enableLairActions).toBe(false);
      expect(settings.enableGridMovement).toBe(false);
      expect(settings.gridSize).toBe(5);
    });
  });

  describe('createDefaultCombatState', () => {
    it('should return default combat state', () => {
      const state = createDefaultCombatState();
      expect(state.isActive).toBe(false);
      expect(state.currentRound).toBe(0);
      expect(state.currentTurn).toBe(0);
      expect(state.initiativeOrder).toEqual([]);
      expect(state.totalDuration).toBe(0);
    });
  });

  describe('validateParticipantHP', () => {
    it('should cap current HP at maximum', () => {
      const participant: IParticipantReference = createTestParticipant({
        currentHitPoints: 150,
      });

      validateParticipantHP(participant);
      expect(participant.currentHitPoints).toBe(100);
    });

    it('should ensure temporary HP is not negative', () => {
      const participant: IParticipantReference = createTestParticipant({
        currentHitPoints: 100,
        temporaryHitPoints: -10,
      });

      validateParticipantHP(participant);
      expect(participant.temporaryHitPoints).toBe(0);
    });
  });
});
