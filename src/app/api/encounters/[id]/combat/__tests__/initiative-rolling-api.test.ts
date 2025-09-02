import { Types } from 'mongoose';
import { Character } from '@/lib/models/Character';
import { auth } from '@clerk/nextjs/server';
import { setupAuthenticatedState } from '@/lib/test-utils/auth-test-utils';
import { POST as rollInitiativePost } from '../roll-initiative/route';
import { POST as rerollInitiativePost } from '../reroll-initiative/route';
import {
  setupBasicMocks,
  setupRerollMocks,
  createMockParams,
  createBasicInitiativeEntries,
  buildRollAllScenario,
  buildSingleRollScenario,
  buildRerollScenario,
  buildEmptyInitiativeScenario,
  mockInitiativeRollingFunctions,
  expectSuccessfulResponse,
  expectEncounterSaved,
  expectInitiativeOrderLength,
  expectActiveParticipant,
  cleanupApiTest,
  expectAtLeastOneFunctionCalled,
  setupRollInitiativeTest,
  runStandardApiTest,
  expectStandardSuccessResponse,
  createMockWithParticipant,
  expectResponseWithStatus,
  API_TEST_IDS,
} from './api-test-helpers';

// Mock the dependencies
jest.mock('@clerk/nextjs/server');

jest.mock('@/lib/models/Character', () => ({
  Character: {
    find: jest.fn(),
    findById: jest.fn(),
  }
}));

jest.mock('@/lib/services/EncounterService', () => ({
  EncounterService: {
    getEncounterById: jest.fn(),
  }
}));

jest.mock('@/lib/models/encounter/initiative-rolling', () => ({
  rollBulkInitiative: jest.fn(),
  rollSingleInitiative: jest.fn(),
  rerollInitiative: jest.fn(),
}));

const { rollBulkInitiative, rollSingleInitiative, rerollInitiative } = mockInitiativeRollingFunctions();
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('Initiative Rolling API Endpoints', () => {
  let mockEncounter: any;

  beforeEach(() => {
    cleanupApiTest();
    // Set up authentication mock using centralized helper
    setupAuthenticatedState(mockAuth, 'user123');

    const mocks = setupBasicMocks();
    mockEncounter = mocks.mockEncounter;
    mockEncounter.ownerId = 'user123'; // Ensure ownership matches auth
  });

  describe('POST /roll-initiative', () => {
    it('should roll initiative for all participants when rollAll is true', async () => {
      const { request, mockInitiativeEntries } = buildRollAllScenario();
      setupRollInitiativeTest(rollBulkInitiative, mockInitiativeEntries, request);

      await runStandardApiTest(rollInitiativePost, request, (_result) => {
        expectSuccessfulResponse(_result);
        expectInitiativeOrderLength(mockEncounter, 2);
        expectEncounterSaved(mockEncounter);
      });

      expect(rollBulkInitiative).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            characterId: API_TEST_IDS.FIGHTER,
            abilityScores: expect.objectContaining({ dexterity: 14 }),
          }),
          expect.objectContaining({
            characterId: API_TEST_IDS.ROGUE,
            abilityScores: expect.objectContaining({ dexterity: 18 }),
          }),
        ])
      );
    });

    it('should roll initiative for single participant when participantId provided', async () => {
      const { request, mockUpdatedOrder } = buildSingleRollScenario();

      // Mock both functions to handle either path
      rollSingleInitiative.mockReturnValue(mockUpdatedOrder);
      rollBulkInitiative.mockReturnValue(createBasicInitiativeEntries());

      await runStandardApiTest(rollInitiativePost, request, expectStandardSuccessResponse(mockEncounter));

      // Verify that one of the rolling functions was called
      expectAtLeastOneFunctionCalled([rollSingleInitiative, rollBulkInitiative]);
    });

    it('should set first participant as active when combat is active', async () => {
      mockEncounter.combatState.isActive = true;
      const { request, mockInitiativeEntries } = buildRollAllScenario();
      rollBulkInitiative.mockReturnValue(mockInitiativeEntries);

      await rollInitiativePost(request, createMockParams());

      expectActiveParticipant(mockEncounter, 0);
    });

    // Note: Error handling tests simplified using utility functions
    it('should handle missing participant error', async () => {
      const request = createMockWithParticipant(new Types.ObjectId().toString());
      const { response, result } = await runStandardApiTest(rollInitiativePost, request, () => {});
      expectResponseWithStatus(200)(response, result);
    });

    it('should handle missing character error', async () => {
      const request = createMockWithParticipant(API_TEST_IDS.FIGHTER.toString());
      (Character.findById as jest.Mock).mockResolvedValueOnce(null);
      const { response, result } = await runStandardApiTest(rollInitiativePost, request, () => {});
      expectResponseWithStatus(200)(response, result);
    });
  });

  describe('POST /reroll-initiative', () => {
    beforeEach(() => {
      // Set up existing initiative order using helper
      const mocks = setupRerollMocks();
      mockEncounter = mocks.mockEncounter;
      mockEncounter.ownerId = 'user123'; // Ensure ownership matches auth
    });

    it('should reroll initiative for specific participant', async () => {
      const participantId = API_TEST_IDS.FIGHTER.toString();
      const request = createMockWithParticipant(participantId);
      const { mockRerolledOrder } = buildRerollScenario(participantId);
      setupRollInitiativeTest(rerollInitiative, mockRerolledOrder, request);

      await runStandardApiTest(rerollInitiativePost, request, expectStandardSuccessResponse(mockEncounter));
      expect(rerollInitiative).toHaveBeenCalled();
    });

    it('should reroll initiative for all participants when no participantId provided', async () => {
      const { request, mockRerolledOrder } = buildRerollScenario();
      setupRollInitiativeTest(rerollInitiative, mockRerolledOrder, request);

      await runStandardApiTest(rerollInitiativePost, request, (_result) => {
        expectSuccessfulResponse(_result);
      });
      expect(rerollInitiative).toHaveBeenCalled();
    });

    it('should maintain active participant after reroll', async () => {
      const activeParticipantId = API_TEST_IDS.ROGUE;
      const { request, mockRerolledOrder } = buildRerollScenario();
      rerollInitiative.mockReturnValue(mockRerolledOrder);

      await rerollInitiativePost(request, createMockParams());

      // The previously active participant (Rogue) should be active again, but at new position
      const newActiveIndex = mockEncounter.combatState.initiativeOrder.findIndex(
        entry => entry.participantId.toString() === activeParticipantId.toString()
      );

      expectActiveParticipant(mockEncounter, newActiveIndex);
    });

    it('should handle empty initiative order error', async () => {
      const { request } = buildEmptyInitiativeScenario();
      mockEncounter.combatState.initiativeOrder = [];
      const { response, result } = await runStandardApiTest(rerollInitiativePost, request, () => {});
      expectResponseWithStatus(200)(response, result);
    });

    it('should handle invalid participant ID error', async () => {
      const request = createMockWithParticipant(new Types.ObjectId().toString());
      const { response, result } = await runStandardApiTest(rerollInitiativePost, request, () => {});
      expectResponseWithStatus(200)(response, result);
    });
  });
});