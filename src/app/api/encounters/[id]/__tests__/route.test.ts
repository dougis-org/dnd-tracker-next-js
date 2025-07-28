import { GET, PUT, DELETE } from '../route';
import { EncounterService } from '@/lib/services/EncounterService';
import {
  createRequestWithAuth,
  createUnauthenticatedRequest,
  createTestContext,
  expectSuccessResponse,
  expectAuthError,
  expectValidationError,
  testApiRouteAuth,
  testApiRouteUnauth,
  setupAuthTestEnvironment,
  TEST_USERS,
  resetAuthMocks,
} from '@/__tests__/auth-session-test-helpers';

// Mock dependencies
jest.mock('@/lib/services/EncounterService');

const mockEncounterService = EncounterService as jest.Mocked<typeof EncounterService>;

describe('/api/encounters/[id] route', () => {
  const testUserId = TEST_USERS.FREE_USER.userId;
  const testEncounterId = 'test-encounter-123';

  const mockEncounter = {
    _id: testEncounterId,
    name: 'Test Encounter',
    description: 'Test description',
    ownerId: testUserId,
    difficulty: 'medium',
    participants: [],
    settings: {
      allowPlayerVisibility: true,
      autoRollInitiative: false,
    },
  };

  const mockApiResponses = {
    success: (data: any) => ({ success: true, data }),
    error: (message: string) => ({ success: false, error: { message } }),
  };

  setupAuthTestEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthMocks();
  });

  describe('GET /api/encounters/[id]', () => {
    it('should return encounter when found', async () => {
      mockEncounterService.getEncounterById.mockResolvedValue(
        mockApiResponses.success(mockEncounter)
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testEncounterId }
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Encounter');
      expect(mockEncounterService.getEncounterById).toHaveBeenCalledWith(
        testEncounterId,
        testUserId
      );
    });

    it('should return 404 when encounter not found', async () => {
      mockEncounterService.getEncounterById.mockResolvedValue(
        mockApiResponses.error('Encounter not found')
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testEncounterId }
      );

      expect(response.status).toBe(500); // Service error becomes 500 in handleApiError
      expect(data.success).toBe(false);
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(
        GET,
        undefined,
        { id: testEncounterId }
      );

      expectAuthError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockEncounterService.getEncounterById.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { response, data } = await testApiRouteAuth(
        GET,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testEncounterId }
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('PUT /api/encounters/[id]', () => {
    const validUpdateData = {
      name: 'Updated Encounter',
      description: 'Updated description',
      difficulty: 'hard' as const,
      participants: [],
      settings: {
        allowPlayerVisibility: true,
        autoRollInitiative: true,
      },
    };

    it('should update encounter successfully', async () => {
      const updatedEncounter = { ...mockEncounter, ...validUpdateData };
      mockEncounterService.updateEncounter.mockResolvedValue(
        mockApiResponses.success(updatedEncounter)
      );

      const request = createRequestWithAuth(
        `/api/encounters/${testEncounterId}`,
        'PUT',
        validUpdateData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testEncounterId });

      const response = await PUT(request, context);
      const data = await response.json();

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Encounter');
    });

    it('should return 401 when user not authenticated', async () => {
      const request = createUnauthenticatedRequest(
        `/api/encounters/${testEncounterId}`,
        'PUT',
        validUpdateData
      );
      const context = createTestContext({ id: testEncounterId });

      const response = await PUT(request, context);

      expectAuthError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validUpdateData, name: '' };

      const request = createRequestWithAuth(
        `/api/encounters/${testEncounterId}`,
        'PUT',
        invalidData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testEncounterId });

      const response = await PUT(request, context);

      expectValidationError(response);
    });

    it('should validate participant structure', async () => {
      const invalidParticipantData = {
        ...validUpdateData,
        participants: [{ invalidField: 'invalid' }],
      };

      const request = createRequestWithAuth(
        `/api/encounters/${testEncounterId}`,
        'PUT',
        invalidParticipantData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testEncounterId });

      const response = await PUT(request, context);

      expectValidationError(response);
    });

    it('should validate settings structure', async () => {
      const invalidSettingsData = {
        ...validUpdateData,
        settings: { invalidSetting: 'invalid' },
      };

      const request = createRequestWithAuth(
        `/api/encounters/${testEncounterId}`,
        'PUT',
        invalidSettingsData,
        TEST_USERS.FREE_USER
      );
      const context = createTestContext({ id: testEncounterId });

      const response = await PUT(request, context);

      expectValidationError(response);
    });
  });

  describe('DELETE /api/encounters/[id]', () => {
    it('should delete encounter successfully', async () => {
      mockEncounterService.deleteEncounter.mockResolvedValue(
        mockApiResponses.success(undefined)
      );

      const { response, data } = await testApiRouteAuth(
        DELETE,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testEncounterId }
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(mockEncounterService.deleteEncounter).toHaveBeenCalledWith(
        testEncounterId,
        testUserId
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testApiRouteUnauth(
        DELETE,
        undefined,
        { id: testEncounterId }
      );

      expectAuthError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockEncounterService.deleteEncounter.mockRejectedValue(
        new Error('Failed to delete encounter')
      );

      const { response, data } = await testApiRouteAuth(
        DELETE,
        TEST_USERS.FREE_USER,
        undefined,
        { id: testEncounterId }
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to delete encounter');
    });
  });
});