import { PATCH } from '../route';
import { EncounterService } from '@/lib/services/EncounterService';
import { auth } from '@clerk/nextjs/server';
import {
  TEST_SETTINGS,
  TEST_INVALID_SETTINGS,
  TEST_PARTIAL_SETTINGS,
  createTestRequest,
  createTestParams,
  createServiceSuccess,
  createServiceError,
  expectServiceCall,
  expectSuccessResponse,
  expectErrorResponse,
} from '@/__test-utils__/encounter-settings-test-utils';
import {
  mockAuthSuccess,
  mockAuthFailure,
  TEST_USER,
} from '@/app/api/encounters/__tests__/shared-test-utilities';

// Configure Jest to use our mocks
jest.mock('next/server');

// Mock the EncounterService
jest.mock('@/lib/services/EncounterService', () => {
  return {
    EncounterService: {
      updateEncounter: jest.fn(),
      getEncounterById: jest.fn(),
    },
  };
});

// Mock the auth
jest.mock('@clerk/nextjs/server');

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('PATCH /api/encounters/[id]/settings', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to successful authentication
    mockAuthSuccess(mockAuth);
    // Mock successful encounter access by default
    EncounterService.getEncounterById = jest.fn().mockResolvedValue({
      success: true,
      data: { ownerId: TEST_USER.id }
    });
  });

  it('successfully updates encounter settings', async () => {
    EncounterService.updateEncounter = jest.fn().mockResolvedValue(createServiceSuccess());

    const request = createTestRequest(TEST_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectSuccessResponse(response, TEST_SETTINGS);
    expectServiceCall(EncounterService.updateEncounter, TEST_SETTINGS);
  });

  it('returns validation errors for invalid settings data', async () => {
    const request = createTestRequest(TEST_INVALID_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectErrorResponse(response, 400, 'Validation error');
    expect(EncounterService.updateEncounter).not.toHaveBeenCalled();
  });

  it('returns error for invalid encounter ID format', async () => {
    const request = createTestRequest(TEST_SETTINGS);
    const response = await PATCH(request, createTestParams('invalid-id'));

    await expectErrorResponse(response, 400, 'Validation error');
    expect(EncounterService.updateEncounter).not.toHaveBeenCalled();
  });

  it('returns 404 when encounter not found', async () => {
    EncounterService.updateEncounter = jest.fn().mockResolvedValue(
      createServiceError('Encounter not found', 404)
    );

    const request = createTestRequest(TEST_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectErrorResponse(response, 404, 'Encounter not found');
    expectServiceCall(EncounterService.updateEncounter, TEST_SETTINGS);
  });

  it('handles service errors gracefully', async () => {
    EncounterService.updateEncounter = jest.fn().mockResolvedValue(
      createServiceError('Database connection failed', 500)
    );

    const request = createTestRequest(TEST_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectErrorResponse(response, 500, 'Database connection failed');
    expectServiceCall(EncounterService.updateEncounter, TEST_SETTINGS);
  });

  it('handles unexpected errors', async () => {
    EncounterService.updateEncounter = jest
      .fn()
      .mockRejectedValue(new Error('Unexpected error'));

    const request = createTestRequest(TEST_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectErrorResponse(response, 500, 'An unexpected error occurred');
    expectServiceCall(EncounterService.updateEncounter, TEST_SETTINGS);
  });

  it('validates partial settings updates', async () => {
    const mergedSettings = { ...TEST_SETTINGS, ...TEST_PARTIAL_SETTINGS };
    EncounterService.updateEncounter = jest.fn().mockResolvedValue(
      createServiceSuccess(mergedSettings)
    );

    const request = createTestRequest(TEST_PARTIAL_SETTINGS);
    const response = await PATCH(request, createTestParams());

    await expectSuccessResponse(response, mergedSettings);
    expectServiceCall(EncounterService.updateEncounter, TEST_PARTIAL_SETTINGS);
  });

  it('validates lair action settings dependency', async () => {
    const lairSettings = {
      enableLairActions: true,
      lairActionInitiative: 15,
    };
    const request = createTestRequest(lairSettings);
    const response = await PATCH(request, createTestParams());
    await response.json();

    // This should still be valid as the schema allows optional lairActionInitiative
    // The business logic for enforcing the dependency should be in the service layer
    expect(response.status).toBe(200);
  });

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuthFailure(mockAuth);

      const request = createTestRequest(TEST_SETTINGS);
      const response = await PATCH(request, createTestParams());

      await expectErrorResponse(response, 401, 'Authentication required');
      expect(EncounterService.updateEncounter).not.toHaveBeenCalled();
      expect(EncounterService.getEncounterById).not.toHaveBeenCalled();
    });

    it('returns 403 when user does not own the encounter', async () => {
      // Mock encounter owned by different user
      EncounterService.getEncounterById = jest.fn().mockResolvedValue({
        success: true,
        data: { ownerId: 'different-user-id' }
      });

      const request = createTestRequest(TEST_SETTINGS);
      const response = await PATCH(request, createTestParams());

      await expectErrorResponse(response, 403, 'Insufficient permissions');
      expect(EncounterService.updateEncounter).not.toHaveBeenCalled();
    });

    it('returns 404 when encounter is not found', async () => {
      EncounterService.getEncounterById = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Encounter not found', statusCode: 404 }
      });

      const request = createTestRequest(TEST_SETTINGS);
      const response = await PATCH(request, createTestParams());

      await expectErrorResponse(response, 404, 'Encounter not found');
      expect(EncounterService.updateEncounter).not.toHaveBeenCalled();
    });
  });
});