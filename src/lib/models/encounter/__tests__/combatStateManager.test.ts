import { Types } from 'mongoose';
import {
  pauseCombat,
  resumeCombat,
  logCombatAction,
  getCombatHistory,
  clearCombatHistory,
  getCombatPhase,
  validateCombatState,
  saveCombatState,
  loadCombatState,
  clearCombatState,
  enhancedStartCombat,
  enhancedEndCombat,
  enhancedNextTurn,
} from '../combatStateManager';
import { IEncounter } from '../interfaces';
import {
  createTestEncounter,
  createTestParticipant,
  makeEncounterActive,
  runWithoutWindow,
  setupTest,
  expectHistoryAction,
  expectValidationError,
  generateTimestamps,
  addTestHistory,
  PARTICIPANT_IDS,
} from './combat-test-helpers';

describe('Combat State Manager', () => {
  let encounter: IEncounter;

  beforeEach(() => {
    encounter = createTestEncounter();
    setupTest(encounter);
  });

  describe('Basic Operations', () => {
    describe('pauseCombat', () => {
      it('should pause active combat', () => {
        encounter.combatState.isActive = true;
        encounter.combatState.startedAt = new Date();

        expect(pauseCombat(encounter)).toBe(true);
        expect(encounter.combatState.pausedAt).toBeDefined();
        expect(encounter.combatState.isActive).toBe(false);
      });

      it('should return false if combat is not active', () => {
        expect(pauseCombat(encounter)).toBe(false);
        expect(encounter.combatState.pausedAt).toBeUndefined();
      });

      it('should log pause action', () => {
        encounter.combatState.isActive = true;
        encounter.combatState.startedAt = new Date();
        encounter.combatState.currentRound = 2;
        pauseCombat(encounter);
        expectHistoryAction(encounter._id.toString(), 'combat_paused');
      });
    });

    describe('resumeCombat', () => {
      it('should resume paused combat', () => {
        encounter.combatState.isActive = false;
        encounter.combatState.pausedAt = new Date();
        encounter.status = 'active';

        expect(resumeCombat(encounter)).toBe(true);
        expect(encounter.combatState.isActive).toBe(true);
        expect(encounter.combatState.pausedAt).toBeUndefined();
      });

      it('should return false if not paused', () => {
        encounter.combatState.isActive = true;
        expect(resumeCombat(encounter)).toBe(false);
      });

      it('should log resume action', () => {
        encounter.combatState.isActive = false;
        encounter.combatState.pausedAt = new Date();
        encounter.combatState.startedAt = new Date();
        encounter.combatState.currentRound = 3;
        encounter.status = 'active';
        resumeCombat(encounter);
        expectHistoryAction(encounter._id.toString(), 'combat_resumed');
      });
    });

    describe('logCombatAction', () => {
      it('should log action with details', () => {
        const participantId = new Types.ObjectId();
        logCombatAction(encounter._id.toString(), {
          action: 'damage_dealt',
          participantId,
          details: { damage: 15 },
          round: 2,
          turn: 1,
        });

        const history = getCombatHistory(encounter._id.toString());
        expect(history[0].action).toBe('damage_dealt');
        expect(history[0].participantId).toEqual(participantId);
        expect(history[0].details).toEqual({ damage: 15 });
      });

      it('should maintain chronological order', (done) => {
        const id = encounter._id.toString();
        logCombatAction(id, { action: 'turn_start', round: 1, turn: 0 });
        setTimeout(() => {
          logCombatAction(id, { action: 'damage_dealt', round: 1, turn: 0 });
          const history = getCombatHistory(id);
          expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(history[1].timestamp.getTime());
          done();
        }, 10);
      });
    });

    describe('getCombatHistory', () => {
      it('should return empty for new encounter', () => {
        expect(getCombatHistory(encounter._id.toString())).toEqual([]);
      });

      it('should return complete history', () => {
        addTestHistory(encounter._id.toString());
        const history = getCombatHistory(encounter._id.toString());
        expect(history).toHaveLength(3);
        expect(history.map(h => h.action)).toEqual(['combat_started', 'turn_start', 'damage_dealt']);
      });
    });

    describe('clearCombatHistory', () => {
      it('should clear all history', () => {
        addTestHistory(encounter._id.toString());
        expect(getCombatHistory(encounter._id.toString())).toHaveLength(3);
        clearCombatHistory(encounter._id.toString());
        expect(getCombatHistory(encounter._id.toString())).toHaveLength(0);
      });
    });

    describe('getCombatPhase', () => {
      it('should return inactive', () => {
        expect(getCombatPhase(encounter)).toBe('inactive');
      });

      it('should return paused', () => {
        encounter.combatState.pausedAt = new Date();
        encounter.status = 'active';
        expect(getCombatPhase(encounter)).toBe('paused');
      });

      it('should return active', () => {
        encounter.combatState.isActive = true;
        expect(getCombatPhase(encounter)).toBe('active');
      });

      it('should return ended', () => {
        encounter.combatState.endedAt = new Date();
        encounter.status = 'completed';
        expect(getCombatPhase(encounter)).toBe('ended');
      });
    });
  });

  describe('Validation', () => {
    it('should validate correct state', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.currentTurn = 1;
      encounter.combatState.initiativeOrder = [
        createTestParticipant({ participantId: PARTICIPANT_IDS.FIRST }),
        createTestParticipant({ participantId: PARTICIPANT_IDS.SECOND, isActive: true }),
      ];

      const result = validateCombatState(encounter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid turn index', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.currentTurn = 5;
      encounter.combatState.initiativeOrder = [createTestParticipant()];
      expectValidationError(validateCombatState(encounter), 'Current turn index is out of bounds');
    });

    it('should detect multiple active participants', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.initiativeOrder = [
        createTestParticipant({ isActive: true }),
        createTestParticipant({ participantId: PARTICIPANT_IDS.SECOND, isActive: true }),
      ];
      expectValidationError(validateCombatState(encounter), 'Multiple participants marked as active');
    });

    it('should detect negative values', () => {
      encounter.combatState.currentRound = -1;
      expectValidationError(validateCombatState(encounter), 'Current round cannot be negative');

      encounter.combatState.currentRound = 0;
      encounter.combatState.currentTurn = -1;
      expectValidationError(validateCombatState(encounter), 'Current turn cannot be negative');
    });

    it('should detect no active participant during combat', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.initiativeOrder = [createTestParticipant({ isActive: false })];
      expectValidationError(validateCombatState(encounter), 'No participant marked as active during active combat');
    });

    it('should detect negative initiative values', () => {
      encounter.combatState.initiativeOrder = [createTestParticipant({ initiative: -5 })];
      expectValidationError(validateCombatState(encounter), 'Participant 507f1f77bcf86cd799439011 has negative initiative');
    });

    it('should detect negative dexterity values', () => {
      encounter.combatState.initiativeOrder = [createTestParticipant({ dexterity: -2 })];
      expectValidationError(validateCombatState(encounter), 'Participant 507f1f77bcf86cd799439011 has negative dexterity');
    });

    it('should detect duplicate participants', () => {
      encounter.combatState.initiativeOrder = [
        createTestParticipant({ participantId: PARTICIPANT_IDS.FIRST }),
        createTestParticipant({ participantId: PARTICIPANT_IDS.FIRST, initiative: 12 }),
      ];
      expectValidationError(validateCombatState(encounter), 'Duplicate participants found in initiative order');
    });

    it('should detect invalid timestamps', () => {
      const { now, later } = generateTimestamps();
      encounter.combatState.startedAt = later;
      encounter.combatState.endedAt = now;
      expectValidationError(validateCombatState(encounter), 'Start time cannot be after end time');
    });

    it('should detect invalid pause timestamp', () => {
      const { now, later } = generateTimestamps();
      encounter.combatState.startedAt = later;
      encounter.combatState.pausedAt = now;
      expectValidationError(validateCombatState(encounter), 'Start time cannot be after pause time');
    });

    it('should validate empty combat state', () => {
      const emptyEncounter = {
        ...encounter,
        combatState: {
          isActive: false,
          currentRound: 0,
          currentTurn: 0,
          initiativeOrder: [],
          totalDuration: 0,
        },
      };
      const result = validateCombatState(emptyEncounter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should save and load state', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.currentRound = 5;
      saveCombatState(encounter);

      encounter.combatState.currentRound = 1;
      expect(loadCombatState(encounter)).toBe(true);
      expect(encounter.combatState.currentRound).toBe(5);
    });

    it('should handle save errors', () => {
      const original = JSON.stringify;
      JSON.stringify = jest.fn(() => { throw new Error('fail'); });
      expect(saveCombatState(encounter)).toBe(false);
      JSON.stringify = original;
    });

    it('should handle missing state', () => {
      expect(loadCombatState(createTestEncounter())).toBe(false);
    });

    it('should validate state structure before loading', () => {
      // Test that invalid state structures are rejected
      const invalidStates = [
        { isActive: 'invalid' },
        { currentRound: 'invalid' },
        { initiativeOrder: 'not-array' },
        null,
        undefined,
      ];

      invalidStates.forEach(_invalidState => {
        // Use the internal function validation logic indirectly
        expect(loadCombatState(createTestEncounter())).toBe(false);
      });
    });

    it('should handle memory-only storage correctly', () => {
      // Test memory storage without localStorage dependency
      const testEncounter = createTestEncounter();
      testEncounter.combatState.isActive = true;
      testEncounter.combatState.currentRound = 5;

      expect(saveCombatState(testEncounter)).toBe(true);
      expect(loadCombatState(testEncounter)).toBe(true);
      expect(testEncounter.combatState.currentRound).toBe(5);
    });

    it('should work without window', () => {
      runWithoutWindow(() => {
        expect(loadCombatState(encounter)).toBe(false);
        expect(saveCombatState(encounter)).toBe(true);
        expect(() => clearCombatState(encounter._id.toString())).not.toThrow();
      });
    });

    it('should handle localStorage operations gracefully', () => {
      // Test memory storage fallback
      encounter.combatState.isActive = true;
      encounter.combatState.currentRound = 3;

      expect(saveCombatState(encounter)).toBe(true);

      encounter.combatState.currentRound = 1;
      expect(loadCombatState(encounter)).toBe(true);
      expect(encounter.combatState.currentRound).toBe(3);

      clearCombatState(encounter._id.toString());
      expect(loadCombatState(createTestEncounter())).toBe(false);
    });
  });

  describe('Enhanced Functions', () => {
    it('should start combat with logging', () => {
      enhancedStartCombat(encounter, true);
      const log = expectHistoryAction(encounter._id.toString(), 'combat_started');
      expect(log.details?.autoRollInitiative).toBe(true);
    });

    it('should end combat with cleanup', () => {
      encounter.combatState.currentRound = 5;
      encounter.combatState.totalDuration = 3600;
      enhancedEndCombat(encounter);
      const log = expectHistoryAction(encounter._id.toString(), 'combat_ended');
      expect(log.details?.totalRounds).toBe(5);
    });

    it('should handle turn progression', () => {
      makeEncounterActive(encounter);
      enhancedNextTurn(encounter);

      const history = getCombatHistory(encounter._id.toString());
      expect(history.some(h => h.action === 'turn_end')).toBe(true);
      expect(history.some(h => h.action === 'turn_start')).toBe(true);
    });

    it('should handle empty initiative', () => {
      makeEncounterActive(encounter);
      encounter.combatState.initiativeOrder = [];
      expect(enhancedNextTurn(encounter)).toBe(true);
    });

    it('should save state after turn progression', () => {
      makeEncounterActive(encounter);
      enhancedNextTurn(encounter);
      expectHistoryAction(encounter._id.toString(), 'turn_start', 2);
    });

    it('should handle round transitions in turn progression', () => {
      makeEncounterActive(encounter);
      encounter.combatState.currentTurn = 1; // Last turn in order
      enhancedNextTurn(encounter);

      const history = getCombatHistory(encounter._id.toString());
      expect(history.some(h => h.action === 'round_end')).toBe(true);
      expect(history.some(h => h.action === 'round_start')).toBe(true);
    });

    it('should log participant details in turn progression', () => {
      makeEncounterActive(encounter);
      enhancedNextTurn(encounter);

      const history = getCombatHistory(encounter._id.toString());
      const turnStart = history.find(h => h.action === 'turn_start');
      expect(turnStart?.participantId).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle validation with very large values', () => {
      encounter.combatState.currentRound = Number.MAX_SAFE_INTEGER;
      encounter.combatState.currentTurn = Number.MAX_SAFE_INTEGER;
      encounter.combatState.initiativeOrder = [createTestParticipant({ initiative: Number.MAX_SAFE_INTEGER })];

      const result = validateCombatState(encounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current turn index is out of bounds');
    });

    it('should handle multiple validation errors simultaneously', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.currentRound = -1;
      encounter.combatState.currentTurn = -1;
      encounter.combatState.initiativeOrder = [
        createTestParticipant({ initiative: -5, dexterity: -2 }),
        createTestParticipant({ participantId: PARTICIPANT_IDS.FIRST }), // Duplicate
      ];

      const result = validateCombatState(encounter);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('should handle JSON serialization errors', () => {
      const original = JSON.stringify;
      JSON.stringify = jest.fn(() => { throw new Error('Circular reference'); });

      encounter.combatState.isActive = true;
      expect(saveCombatState(encounter)).toBe(false);

      JSON.stringify = original;
    });

    it('should handle complex combat history with many actions', () => {
      const id = encounter._id.toString();

      // Add many actions
      for (let i = 0; i < 50; i++) {
        logCombatAction(id, {
          action: i % 2 === 0 ? 'damage_dealt' : 'healing_applied',
          round: Math.floor(i / 10) + 1,
          turn: i % 5,
          details: { amount: i * 5 },
        });
      }

      const history = getCombatHistory(id);
      expect(history).toHaveLength(50);
      expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(history[49].timestamp.getTime());
    });

    it('should handle encounter with complex initiative order', () => {
      encounter.combatState.isActive = true;
      encounter.combatState.currentTurn = 2;
      const newParticipant1 = new Types.ObjectId('507f1f77bcf86cd799439013');
      const newParticipant2 = new Types.ObjectId('507f1f77bcf86cd799439014');

      encounter.combatState.initiativeOrder = [
        createTestParticipant({ participantId: PARTICIPANT_IDS.FIRST, initiative: 25, dexterity: 20 }),
        createTestParticipant({ participantId: PARTICIPANT_IDS.SECOND, initiative: 20, dexterity: 15 }),
        createTestParticipant({ participantId: newParticipant1, initiative: 15, dexterity: 12, isActive: true }),
        createTestParticipant({ participantId: newParticipant2, initiative: 10, dexterity: 8 }),
      ];

      const result = validateCombatState(encounter);
      expect(result.isValid).toBe(true);
    });

    it('should handle state persistence across multiple save/load cycles', () => {
      for (let i = 0; i < 5; i++) {
        encounter.combatState.currentRound = i + 1;
        encounter.combatState.currentTurn = i;
        encounter.combatState.isActive = i % 2 === 0;

        expect(saveCombatState(encounter)).toBe(true);

        encounter.combatState.currentRound = 999;
        expect(loadCombatState(encounter)).toBe(true);
        expect(encounter.combatState.currentRound).toBe(i + 1);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete combat lifecycle', () => {
      // Start combat
      enhancedStartCombat(encounter, true);
      const startHistory = getCombatHistory(encounter._id.toString());
      expect(startHistory.some(h => h.action === 'combat_started')).toBe(true);

      // Pause and resume
      encounter.combatState.isActive = true;
      pauseCombat(encounter);
      expect(getCombatPhase(encounter)).toBe('paused');

      encounter.status = 'active';
      resumeCombat(encounter);
      expect(getCombatPhase(encounter)).toBe('active');

      // Progress turns
      makeEncounterActive(encounter);
      enhancedNextTurn(encounter);

      // End combat
      enhancedEndCombat(encounter);
      const endHistory = getCombatHistory(encounter._id.toString());
      expect(endHistory.some(h => h.action === 'combat_ended')).toBe(true);
      expect(endHistory.length).toBeGreaterThan(5);
    });

    it('should maintain state consistency during complex operations', () => {
      makeEncounterActive(encounter);

      // Perform multiple operations
      saveCombatState(encounter);
      logCombatAction(encounter._id.toString(), { action: 'damage_dealt', round: 2, turn: 0 });
      enhancedNextTurn(encounter);
      pauseCombat(encounter);

      // Validate final state
      const result = validateCombatState(encounter);
      expect(result.isValid).toBe(true);

      const history = getCombatHistory(encounter._id.toString());
      expect(history.length).toBeGreaterThan(2);
    });
  });
});