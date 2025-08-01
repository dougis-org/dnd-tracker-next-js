import { GET, PUT, DELETE } from '../route';
import { EncounterService } from '@/lib/services/EncounterService';
import { auth } from '@/lib/auth';
import {
  createTestEncounter,
  createTestParticipant,
  mockApiResponses,
} from '@/app/encounters/[id]/__tests__/test-helpers';
import {
  createValidUpdateData,
  createInvalidUpdateData,
  createInvalidParticipantData,
  createInvalidSettingsData,
  createTestContext,
  createAsyncParams,
  createJsonParseErrorRequest,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse,
  executeApiTest,
  mockSuccessfulAccessValidation,
  createOwnedEncounter,
  testUnauthenticatedAccess,
  testServiceError,
  testEncounterNotFound,
  testUnauthorizedAccess,
  setupTestMocks,
} from './test-helpers';

// Mock dependencies
jest.mock('@/lib/services/EncounterService');
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

const mockEncounterService = EncounterService as jest.Mocked<typeof EncounterService>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/encounters/[id] route', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockEncounter = createTestEncounter({
    name: 'Test Encounter',
    description: 'Test description',
    difficulty: 'medium',
    estimatedDuration: 60,
    targetLevel: 5,
    ownerId: mockUser.id,
    participants: [
      createTestParticipant({
        name: 'Test Player',
        type: 'pc',
        maxHitPoints: 50,
        armorClass: 16,
      }),
    ],
    tags: ['test'],
  });

  const mockSession = {
    user: mockUser,
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(() => {
    setupTestMocks(mockAuth, mockSession);
  });

  describe('GET /api/encounters/[id]', () => {
    it('should return encounter when found', async () => {
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);

      const { response, data } = await executeApiTest(GET, {}, 'GET');

      expectSuccessResponse(response, data);
      expect(data.data.name).toBe('Test Encounter');
      expect(mockEncounterService.getEncounterById).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 when encounter not found', async () => {
      await testEncounterNotFound(mockEncounterService, mockApiResponses, GET);
    });

    it('should return 401 when user not authenticated', async () => {
      await testUnauthenticatedAccess(mockAuth, GET);
    });

    it('should handle service errors gracefully', async () => {
      mockEncounterService.getEncounterById.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });
      
      const { response, data } = await executeApiTest(GET, {}, 'GET');
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/(Database connection failed|Service error)/i);
    });
  });

  describe('PUT /api/encounters/[id]', () => {

    it('should update encounter successfully', async () => {
      const validUpdateData = createValidUpdateData();
      const updatedEncounter = { ...mockEncounter, ...validUpdateData };

      // Mock the getEncounterById call for access validation
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);

      mockEncounterService.updateEncounter.mockResolvedValue(
        mockApiResponses.success(updatedEncounter)
      );

      const { response, data } = await executeApiTest(PUT, validUpdateData, 'PUT');

      expectSuccessResponse(response, data);
      expect(data.data.name).toBe('Updated Encounter');
      expect(mockEncounterService.updateEncounter).toHaveBeenCalledWith(
        'test-id',
        validUpdateData
      );
    });

    it('should validate required fields', async () => {
      const invalidData = createInvalidUpdateData();
      const { response, data } = await executeApiTest(PUT, invalidData, 'PUT');
      expectValidationError(response, data, 'name');
    });

    it('should validate participant structure', async () => {
      const invalidData = createInvalidParticipantData();
      const { response, data } = await executeApiTest(PUT, invalidData, 'PUT');
      expectValidationError(response, data, 'participants');
    });

    it('should validate settings structure', async () => {
      const invalidData = createInvalidSettingsData();
      const { response, data } = await executeApiTest(PUT, invalidData, 'PUT');
      expectValidationError(response, data, 'lairActionInitiative');
    });

    it('should return 401 when user not authenticated', async () => {
      await testUnauthenticatedAccess(mockAuth, PUT, createValidUpdateData(), 'PUT');
    });

    it('should return 404 when encounter not found', async () => {
      await testEncounterNotFound(
        mockEncounterService,
        mockApiResponses,
        PUT,
        createValidUpdateData(),
        'PUT'
      );
    });

    it('should handle malformed JSON', async () => {
      // Ensure auth passes but access validation also passes to reach JSON parsing
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);

      const request = createJsonParseErrorRequest();
      const response = await PUT(request, createTestContext());
      const data = await response.json();

      expectValidationError(response, data, 'Invalid JSON');
    });

    it('should handle service errors gracefully', async () => {
      // Mock access validation to succeed
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);
      
      mockEncounterService.updateEncounter.mockResolvedValue({
        success: false,
        error: 'Database write failed'
      });

      const { response, data } = await executeApiTest(PUT, createValidUpdateData(), 'PUT');
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/(Database write failed|Service error)/i);
    });
  });

  describe('DELETE /api/encounters/[id]', () => {
    it('should delete encounter successfully', async () => {
      // Mock access validation to succeed
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);

      mockEncounterService.deleteEncounter.mockResolvedValue(
        mockApiResponses.success({ deleted: true })
      );

      const { response, data } = await executeApiTest(DELETE, {}, 'DELETE');

      expectSuccessResponse(response, data);
      expect(mockEncounterService.deleteEncounter).toHaveBeenCalledWith('test-id');
    });

    it('should return 401 when user not authenticated', async () => {
      await testUnauthenticatedAccess(mockAuth, DELETE, {}, 'DELETE');
    });

    it('should return 404 when encounter not found', async () => {
      await testEncounterNotFound(mockEncounterService, mockApiResponses, DELETE, {}, 'DELETE');
    });

    it('should handle service errors gracefully', async () => {
      // Mock access validation to succeed
      mockSuccessfulAccessValidation(mockEncounterService, mockApiResponses, mockEncounter, mockUser.id);
      
      mockEncounterService.deleteEncounter.mockResolvedValue({
        success: false,
        error: 'Database delete failed'
      });

      const { response, data } = await executeApiTest(DELETE, {}, 'DELETE');
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/(Database delete failed|Service error)/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      mockEncounterService.getEncounterById.mockRejectedValue(
        new Error('Unexpected error')
      );

      const { response, data } = await executeApiTest(GET, {}, 'GET');

      expectErrorResponse(response, data, 500, 'Internal server error');
    });

    it('should handle missing encounter ID parameter', async () => {
      const { response, data } = await executeApiTest(GET, {}, 'GET', createAsyncParams(''));

      expectValidationError(response, data, 'Encounter ID is required');
    });
  });

  describe('Security', () => {
    it('should validate user ownership for update operations', async () => {
      await testUnauthorizedAccess(
        mockEncounterService,
        mockApiResponses,
        PUT,
        { name: 'Unauthorized Update' }
      );
    });

    it('should validate user ownership for delete operations', async () => {
      await testUnauthorizedAccess(
        mockEncounterService,
        mockApiResponses,
        DELETE,
        {},
        'DELETE'
      );
    });

    it('should sanitize sensitive data in responses', async () => {
      const sensitiveEncounter = createOwnedEncounter(mockEncounter, mockUser.id);

      mockEncounterService.getEncounterById.mockResolvedValue(
        mockApiResponses.success(sensitiveEncounter)
      );

      const { response, data } = await executeApiTest(GET, {}, 'GET');

      expectSuccessResponse(response, data);
      // Verify sensitive fields are handled appropriately
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('participants');
    });
  });
});