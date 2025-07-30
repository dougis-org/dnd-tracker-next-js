import { Types } from 'mongoose';
import { IEncounter } from '../interfaces';
import {
  clearCombatHistory,
  clearCombatState,
  logCombatAction,
  getCombatHistory,
} from '../combatStateManager';

/**
 * Comprehensive test utilities for combat state manager tests
 * Eliminates all code duplication across test files
 */

// Standard participant IDs for consistent testing
export const PARTICIPANT_IDS = {
  FIRST: new Types.ObjectId('507f1f77bcf86cd799439011'),
  SECOND: new Types.ObjectId('507f1f77bcf86cd799439012'),
} as const;

// Mock encounter factory
export const createTestEncounter = (): IEncounter => ({
  _id: new Types.ObjectId('507f1f77bcf86cd799439999'),
  ownerId: new Types.ObjectId(),
  name: 'Test Encounter',
  description: 'Test description',
  tags: [],
  difficulty: 'medium',
  estimatedDuration: 60,
  targetLevel: 5,
  status: 'draft',
  participants: [],
  combatState: {
    isActive: false,
    currentRound: 0,
    currentTurn: 0,
    initiativeOrder: [],
    totalDuration: 0,
  },
  settings: {
    allowPlayerVisibility: true,
    autoRollInitiative: false,
    trackResources: true,
    enableLairActions: false,
    enableGridMovement: false,
    gridSize: 5,
  },
  isPublic: false,
  participantCount: 0,
  playerCount: 0,
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  toObject: jest.fn().mockReturnValue({}),
  constructor: jest.fn(),
  addParticipant: jest.fn(),
  removeParticipant: jest.fn(),
  updateParticipant: jest.fn(),
  getParticipant: jest.fn(),
  startCombat: jest.fn(),
  endCombat: jest.fn(),
  nextTurn: jest.fn(),
  previousTurn: jest.fn(),
  setInitiative: jest.fn(),
  applyDamage: jest.fn(),
  applyHealing: jest.fn(),
  addCondition: jest.fn(),
  removeCondition: jest.fn(),
  getInitiativeOrder: jest.fn(),
  calculateDifficulty: jest.fn(),
  duplicateEncounter: jest.fn(),
  toSummary: jest.fn(),
  currentParticipant: null,
  sharedWith: [],
});

// Standard test participant
export const createTestParticipant = (overrides = {}) => ({
  participantId: PARTICIPANT_IDS.FIRST,
  initiative: 15,
  dexterity: 14,
  isActive: false,
  hasActed: false,
  ...overrides,
});

// Setup active encounter with standard configuration
export const makeEncounterActive = (encounter: IEncounter) => {
  encounter.combatState.isActive = true;
  encounter.combatState.currentRound = 2;
  encounter.combatState.currentTurn = 0;
  encounter.combatState.startedAt = new Date();
  encounter.combatState.initiativeOrder = [
    createTestParticipant({
      participantId: PARTICIPANT_IDS.FIRST,
      initiative: 20,
      dexterity: 15,
      isActive: true,
    }),
    createTestParticipant({
      participantId: PARTICIPANT_IDS.SECOND,
      initiative: 15,
      dexterity: 12,
    }),
  ];

  // Add participants with names for testing
  encounter.participants = [
    {
      characterId: PARTICIPANT_IDS.FIRST,
      name: 'Test Character 1',
      type: 'Player',
      maxHitPoints: 45,
      currentHitPoints: 45,
      temporaryHitPoints: 0,
      armorClass: 15,
      initiative: 20,
      isPlayer: true,
      isVisible: true,
      notes: '',
      conditions: [],
    },
    {
      characterId: PARTICIPANT_IDS.SECOND,
      name: 'Test Character 2',
      type: 'NPC',
      maxHitPoints: 22,
      currentHitPoints: 22,
      temporaryHitPoints: 0,
      armorClass: 13,
      initiative: 15,
      isPlayer: false,
      isVisible: true,
      notes: '',
      conditions: [],
    },
  ];
};

// Window mocking utility
export const runWithoutWindow = (testFn: () => void) => {
  const originalWindow = global.window;
  delete (global as any).window;
  try {
    testFn();
  } finally {
    global.window = originalWindow;
  }
};

// Storage mocking utility
export const mockStorage = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
});

export const runWithMockStorage = (testFn: (_storage: ReturnType<typeof mockStorage>) => void) => {
  const originalWindow = global.window;
  const storage = mockStorage();

  // Simple window mocking
  global.window = {
    localStorage: storage,
  } as any;

  try {
    testFn(storage);
  } finally {
    global.window = originalWindow;
  }
};

// Test setup and cleanup utilities
export const setupTest = (encounter: IEncounter) => {
  clearCombatHistory(encounter._id.toString());
  clearCombatState(encounter._id.toString());
};

// Common test assertions
export const expectHistoryAction = (encounterId: string, action: string, expectedLength = 1) => {
  const history = getCombatHistory(encounterId);
  expect(history).toHaveLength(expectedLength);
  expect(history[expectedLength - 1].action).toBe(action);
  return history[expectedLength - 1];
};

export const expectValidationError = (result: any, expectedError: string) => {
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain(expectedError);
};

// Common test data generators
export const generateTimestamps = () => {
  const now = new Date();
  const later = new Date(now.getTime() + 60000);
  return { now, later };
};

export const addTestHistory = (encounterId: string) => {
  logCombatAction(encounterId, { action: 'combat_started', round: 1, turn: 0 });
  logCombatAction(encounterId, { action: 'turn_start', round: 1, turn: 0 });
  logCombatAction(encounterId, { action: 'damage_dealt', round: 1, turn: 0 });
};