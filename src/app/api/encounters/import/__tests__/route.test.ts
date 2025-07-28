import { describe, it, expect } from '@jest/globals';

// Mock auth module FIRST - this must be before any imports that use it
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/lib/services/EncounterServiceImportExport');

// Import everything after mocks are set up
import { POST } from '../route';
import { EncounterServiceImportExport } from '@/lib/services/EncounterServiceImportExport';
import { getServerSession } from '@/lib/auth/server-session';
import {
  TEST_USERS,
  testAuthenticatedRoute,
  testUnauthenticatedRoute,
  expectSuccessResponse,
  expectAuthenticationError,
  expectSuccessData,
  expectErrorData,
  setupApiRouteTests,
} from '@/__tests__/auth-session-test-helpers';

// Get the mocked function from the module
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockService = EncounterServiceImportExport as jest.Mocked<typeof EncounterServiceImportExport>;


describe('/api/encounters/import API Route', () => {
  setupApiRouteTests();

  const testUserId = TEST_USERS.FREE_USER.userId;

  const mockImportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: testUserId,
      format: 'json',
      version: '1.0.0',
      appVersion: '1.0.0',
    },
    encounter: {
      name: 'Imported Encounter',
      description: 'Test import',
      tags: ['test'],
      difficulty: 'medium',
      estimatedDuration: 30,
      targetLevel: 3,
      status: 'draft',
      isPublic: false,
      settings: {
        allowPlayerVisibility: true,
        autoRollInitiative: false,
        trackResources: true,
        enableLairActions: false,
        enableGridMovement: false,
        gridSize: 5,
      },
      participants: [
        {
          id: 'temp-1',
          name: 'Test Character',
          type: 'pc',
          maxHitPoints: 25,
          currentHitPoints: 25,
          temporaryHitPoints: 0,
          armorClass: 15,
          isPlayer: true,
          isVisible: true,
          notes: '',
          conditions: [],
        },
      ],
    },
  };

  const mockEncounter = {
    _id: 'encounter-123',
    name: 'Imported Encounter',
    description: 'Test import',
    participants: [{ name: 'Test Character' }],
    ownerId: testUserId,
  };

  const mockApiResponses = {
    success: (data: any) => ({ success: true, data }),
    error: (message: string) => ({ success: false, error: { message } }),
  };


  describe('POST /api/encounters/import', () => {
    it('should import encounter from JSON successfully', async () => {
      mockService.importFromJson.mockResolvedValue(
        mockApiResponses.success(mockEncounter)
      );

      const requestBody = {
        data: JSON.stringify(mockImportData),
        format: 'json' as const,
        options: {
          createMissingCharacters: true,
          preserveIds: false,
          overwriteExisting: false,
        },
      };

      const { response, data } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: requestBody,
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.encounter).toBeDefined();
      expect(data.encounter.name).toBe('Imported Encounter');
      expect(mockService.importFromJson).toHaveBeenCalledWith(
        JSON.stringify(mockImportData),
        {
          ownerId: testUserId,
          createMissingCharacters: true,
          preserveIds: false,
          overwriteExisting: false,
        }
      );
    });

    it('should import encounter from XML successfully', async () => {
      const xmlData = '<encounter><name>Test XML Encounter</name><description>XML import test</description></encounter>';

      mockService.importFromXml.mockResolvedValue(
        mockApiResponses.success(mockEncounter)
      );

      const requestBody = {
        data: xmlData,
        format: 'xml' as const,
        options: {
          createMissingCharacters: true,
        },
      };

      const { response, data } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: requestBody,
        user: TEST_USERS.FREE_USER
      });

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
      expect(data.encounter).toBeDefined();
      expect(mockService.importFromXml).toHaveBeenCalledWith(
        xmlData,
        {
          ownerId: testUserId,
          createMissingCharacters: true,
          preserveIds: false,
          overwriteExisting: false,
        }
      );
    });

    it('should use default options when not provided', async () => {
      mockService.importFromJson.mockResolvedValue(
        mockApiResponses.success(mockEncounter)
      );

      const requestBody = {
        data: JSON.stringify(mockImportData),
        format: 'json' as const,
      };

      await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: requestBody,
        user: TEST_USERS.FREE_USER
      });

      expect(mockService.importFromJson).toHaveBeenCalledWith(
        JSON.stringify(mockImportData),
        {
          ownerId: testUserId,
          preserveIds: false,
          createMissingCharacters: true,
          overwriteExisting: false,
        }
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const { response } = await testUnauthenticatedRoute(POST, {
        method: 'POST',
        body: {
          data: JSON.stringify(mockImportData),
          format: 'json' as const,
        }
      });

      expectAuthenticationError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockService.importFromJson.mockRejectedValue(
        new Error('Import service failed')
      );

      const requestBody = {
        data: JSON.stringify(mockImportData),
        format: 'json' as const,
      };

      const { response, data } = await testAuthenticatedRoute(POST, {
        method: 'POST',
        body: requestBody,
        user: TEST_USERS.FREE_USER
      });

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('Internal server error');
    });
  });
});