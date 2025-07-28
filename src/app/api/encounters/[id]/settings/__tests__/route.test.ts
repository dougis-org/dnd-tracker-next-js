import { describe, it, expect } from '@jest/globals';

// Mock auth module FIRST - this must be before any imports that use it
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/lib/services/EncounterService');

// Import everything after mocks are set up
import { PATCH } from '../route';
import { EncounterService } from '@/lib/services/EncounterService';
import { getServerSession } from '@/lib/auth/server-session';
import {
  TEST_USERS,
  testAuthenticatedRoute,
  testUnauthenticatedRoute,
  expectSuccessResponse,
  expectAuthenticationError,
  expectValidationError,
  expectSuccessData,
  expectErrorData,
  setupApiRouteTests,
} from '@/__tests__/auth-session-test-helpers';

// Get the mocked function from the module
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockEncounterService = EncounterService as jest.Mocked<typeof EncounterService>;

describe('/api/encounters/[id]/settings API Route', () => {
  setupApiRouteTests();

  const testUserId = TEST_USERS.FREE_USER.userId;
  const testEncounterId = 'encounter-123';

  const mockEncounter = {
    _id: testEncounterId,
    name: 'Test Encounter',
    ownerId: testUserId,
    settings: {
      allowPlayerVisibility: true,
      autoRollInitiative: false,
      turnTimer: 60,
      enableLairActions: true,
    },
  };

  describe('PATCH /api/encounters/[id]/settings', () => {
    const validSettingsUpdate = {
      allowPlayerVisibility: false,
      autoRollInitiative: true,
      turnTimer: 120,
      enableLairActions: false,
    };

    it('should update encounter settings successfully', async () => {
      const updatedEncounter = {
        ...mockEncounter,
        settings: { ...mockEncounter.settings, ...validSettingsUpdate }
      };
      
      mockEncounterService.updateEncounterSettings.mockResolvedValue({
        success: true,
        data: updatedEncounter
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validSettingsUpdate,
        user: TEST_USERS.FREE_USER,
        params: { id: testEncounterId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.settings.allowPlayerVisibility).toBe(false);
      expect(data.data.settings.autoRollInitiative).toBe(true);
      expect(mockEncounterService.updateEncounterSettings).toHaveBeenCalledWith(
        testEncounterId,
        testUserId,
        validSettingsUpdate
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validSettingsUpdate,
        params: { id: testEncounterId }
      });
      expectAuthenticationError(response);
    });

    it('should validate settings data', async () => {
      const invalidSettings = {
        turnTimer: -10, // Invalid negative timer
        invalidField: 'invalid'
      };

      const { response } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: invalidSettings,
        user: TEST_USERS.FREE_USER,
        params: { id: testEncounterId }
      });

      expectValidationError(response);
    });

    it('should handle partial settings updates', async () => {
      const partialUpdate = {
        turnTimer: 90
      };

      const updatedEncounter = {
        ...mockEncounter,
        settings: { ...mockEncounter.settings, turnTimer: 90 }
      };

      mockEncounterService.updateEncounterSettings.mockResolvedValue({
        success: true,
        data: updatedEncounter
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: partialUpdate,
        user: TEST_USERS.FREE_USER,
        params: { id: testEncounterId }
      });

      expectSuccessResponse(response);
      expectSuccessData(data);
      expect(data.data.settings.turnTimer).toBe(90);
      expect(mockEncounterService.updateEncounterSettings).toHaveBeenCalledWith(
        testEncounterId,
        testUserId,
        partialUpdate
      );
    });

    it('should handle service errors gracefully', async () => {
      mockEncounterService.updateEncounterSettings.mockResolvedValue({
        success: false,
        error: { message: 'Encounter not found' }
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validSettingsUpdate,
        user: TEST_USERS.FREE_USER,
        params: { id: testEncounterId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });

    it('should handle ownership validation', async () => {
      mockEncounterService.updateEncounterSettings.mockResolvedValue({
        success: false,
        error: { message: 'Encounter not found or access denied' }
      });

      const { response, data } = await testAuthenticatedRoute(PATCH, {
        method: 'PATCH',
        body: validSettingsUpdate,
        user: TEST_USERS.EXPERT_USER, // Different user
        params: { id: testEncounterId }
      });

      expect(response.status).toBe(500);
      expectErrorData(data);
    });
  });
});