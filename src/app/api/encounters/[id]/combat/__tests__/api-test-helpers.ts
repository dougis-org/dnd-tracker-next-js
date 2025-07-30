import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Character } from '@/lib/models/Character';
// Removed unused import: EncounterService
import {
  TEST_IDS,
  setupTestMocks,
  createMockRequest,
  createMockParams,
  TestAssertions,
  APITestUtils
} from '@/lib/models/encounter/__tests__/base-test-helpers';

/**
 * API Test Helpers for Combat API Tests
 * Built on unified base helpers to eliminate duplication
 * Provides centralized authentication and test setup patterns
 */

// Re-export for backward compatibility
export const API_TEST_IDS = TEST_IDS;

/**
 * Simplified factories using unified base helpers
 */
export const createMockEncounter = (overrides?: any) => {
  const { encounter } = setupTestMocks();
  return { ...encounter, ...overrides };
};

export const createMockInitiativeEntry = (
  participantId: Types.ObjectId,
  name: string,
  overrides?: any
) => ({
  participantId,
  initiative: 16,
  dexterity: 14,
  isActive: false,
  hasActed: false,
  name,
  type: 'pc',
  ...overrides,
});

export const createBasicInitiativeEntries = () => [
  createMockInitiativeEntry(
    TEST_IDS.ROGUE,
    'Rogue',
    { initiative: 22, dexterity: 18 }
  ),
  createMockInitiativeEntry(
    TEST_IDS.FIGHTER,
    'Fighter',
    { initiative: 16, dexterity: 14 }
  ),
];

// Use unified helpers
export const createMockNextRequest = createMockRequest;
export { createMockParams };

// Simplified mock setup using unified helpers
export const setupBasicMocks = () => {
  const { participants, characters, encounter } = setupTestMocks();
  return {
    mockCharacters: characters,
    mockEncounter: encounter,
    mockParticipants: participants
  };
};

// Setup mocks for reroll tests
export const setupRerollMocks = () => {
  const { mockCharacters, mockEncounter } = setupBasicMocks();

  // Add existing initiative order
  mockEncounter.combatState.initiativeOrder = [
    {
      participantId: API_TEST_IDS.ROGUE,
      initiative: 22,
      dexterity: 18,
      isActive: true,
      hasActed: false,
    },
    {
      participantId: API_TEST_IDS.FIGHTER,
      initiative: 16,
      dexterity: 14,
      isActive: false,
      hasActed: true,
    },
  ];
  mockEncounter.combatState.isActive = true;
  mockEncounter.combatState.currentTurn = 0;

  return { mockCharacters, mockEncounter };
};

// Use unified assertion helpers
export const expectSuccessfulResponse = TestAssertions.successfulResponse;
export const expectErrorResponse = TestAssertions.errorResponse;
export const expectEncounterSaved = TestAssertions.encounterSaved;
export const expectInitiativeOrderLength = TestAssertions.initiativeOrderLength;
export const expectActiveParticipant = TestAssertions.activeParticipant;
export const expectFunctionCalled = TestAssertions.functionCalled;

// Test scenario builders
export const buildRollAllScenario = () => ({
  request: createMockNextRequest({ rollAll: true }),
  mockInitiativeEntries: createBasicInitiativeEntries(),
});

export const buildSingleRollScenario = (participantId?: string) => ({
  request: createMockNextRequest({
    participantId: participantId || API_TEST_IDS.FIGHTER.toString(),
    rollAll: false
  }),
  mockUpdatedOrder: [
    createMockInitiativeEntry(
      API_TEST_IDS.FIGHTER,
      'Fighter',
      { initiative: 16, dexterity: 14 }
    ),
  ],
});

export const buildRerollScenario = (participantId?: string) => ({
  request: createMockNextRequest(
    participantId ? { participantId } : {}
  ),
  mockRerolledOrder: [
    createMockInitiativeEntry(
      API_TEST_IDS.FIGHTER,
      'Fighter',
      { initiative: 20, dexterity: 14, hasActed: true }
    ),
    createMockInitiativeEntry(
      API_TEST_IDS.ROGUE,
      'Rogue',
      { initiative: 18, dexterity: 18, hasActed: false }
    ),
  ],
});

// Error scenario builders - consolidated to reduce duplication
export const buildErrorScenario = (
  type: 'missingParticipant' | 'missingCharacter' | 'emptyInitiative',
  customSetup?: () => void
) => {
  const scenarios = {
    missingParticipant: {
      request: createMockNextRequest({ participantId: new Types.ObjectId().toString() }),
      expectedError: 'not found',
      setup: () => {}
    },
    missingCharacter: {
      request: createMockNextRequest({ participantId: API_TEST_IDS.FIGHTER.toString() }),
      expectedError: 'Character',
      setup: () => (Character.findById as jest.Mock).mockResolvedValue(null)
    },
    emptyInitiative: {
      request: createMockNextRequest({}),
      expectedError: 'No initiative order found',
      setup: () => {}
    }
  };

  const scenario = scenarios[type];
  return {
    ...scenario,
    setup: customSetup || scenario.setup
  };
};

export const buildMissingParticipantScenario = () => buildErrorScenario('missingParticipant');
export const buildMissingCharacterScenario = () => buildErrorScenario('missingCharacter');
export const buildEmptyInitiativeScenario = () => buildErrorScenario('emptyInitiative');

// Mock initiative rolling functions
export const mockInitiativeRollingFunctions = () => {
  const { rollBulkInitiative, rollSingleInitiative, rerollInitiative } =
    jest.requireMock('@/lib/models/encounter/initiative-rolling');

  return {
    rollBulkInitiative,
    rollSingleInitiative,
    rerollInitiative,
  };
};

// Use unified test utilities
export const cleanupApiTest = () => {
  jest.clearAllMocks();
};

export const runBasicApiTest = APITestUtils.runBasicTest;
export const runErrorApiTest = APITestUtils.runErrorTest;

// Common test execution patterns
export const setupMocksAndRunTest = async (
  handler: Function,
  request: NextRequest,
  mockFunctions: { [key: string]: jest.Mock },
  mockReturnValues: { [key: string]: any },
  expectations: (_result: any) => void
) => {
  // Setup all mocks
  Object.keys(mockReturnValues).forEach(funcName => {
    mockFunctions[funcName].mockReturnValue(mockReturnValues[funcName]);
  });

  return await runBasicApiTest(handler, request, createMockParams(), expectations);
};

export const expectFunctionCallCounts = (
  functions: { [key: string]: jest.Mock },
  expectedCounts: { [key: string]: number }
) => {
  Object.keys(expectedCounts).forEach(funcName => {
    expect(functions[funcName].mock.calls.length).toBe(expectedCounts[funcName]);
  });
};

export const expectAtLeastOneFunctionCalled = (functions: jest.Mock[]) => {
  const totalCalls = functions.reduce((sum, fn) => sum + fn.mock.calls.length, 0);
  expect(totalCalls).toBeGreaterThan(0);
};

/**
 * Utility functions to eliminate API test code duplication
 */
export const setupRollInitiativeTest = (
  mockFunction: jest.Mock,
  returnValue: any,
  request: NextRequest
) => {
  mockFunction.mockReturnValue(returnValue);
  return { request, handler: createMockParams() };
};

export const runStandardApiTest = async (
  handler: Function,
  request: NextRequest,
  expectations: (_result: any) => void
) => {
  const response = await handler(request, createMockParams());
  const result = await response.json();
  expectations(result);
  return { response, result };
};

export const expectStandardSuccessResponse = (mockEncounter: any) => (result: any) => {
  expectSuccessfulResponse(result);
  expectEncounterSaved(mockEncounter);
};

export const createMockWithParticipant = (participantId: string) => {
  return createMockNextRequest({ participantId });
};

export const expectResponseWithStatus = (status: number) => (response: any, result: any) => {
  expect(response.status).toBeGreaterThanOrEqual(status);
  expect(result).toBeDefined();
};

/**
 * Centralized authentication setup for combat API tests
 * Reduces duplication across test files
 */
export const setupCombatAuthentication = (userId: string = 'user123') => {
  const auth = require('@/lib/auth').auth as jest.MockedFunction<any>;
  auth.mockResolvedValue({
    user: { id: userId }
  } as any);
  return { userId, mockAuth: auth };
};

/**
 * Setup encounter with proper ownership for authenticated user
 */
export const setupAuthenticatedEncounter = (userId: string = 'user123', encounterOverrides: any = {}) => {
  const { encounter } = setupTestMocks();
  encounter.ownerId = userId;
  return { ...encounter, ...encounterOverrides };
};

/**
 * Complete authentication and encounter setup for combat tests
 */
export const setupCombatTestAuth = (userId: string = 'user123', encounterOverrides: any = {}) => {
  const { userId: authUserId, mockAuth } = setupCombatAuthentication(userId);
  const encounter = setupAuthenticatedEncounter(authUserId, encounterOverrides);
  return { userId: authUserId, mockAuth, encounter };
};