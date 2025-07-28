import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { EncounterServiceImportExport } from '@/lib/services/EncounterServiceImportExport';
import type { ServerUserInfo } from '@/lib/auth/server-session';

// Mock the auth module FIRST - must be hoisted
jest.mock('@/lib/auth/server-session', () => ({
  ...jest.requireActual('@/lib/auth/server-session'),
  getServerSession: jest.fn(),
}));

// Get the mocked function after Jest sets up the mock
import { getServerSession } from '@/lib/auth/server-session';
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock the service
jest.mock('@/lib/services/EncounterServiceImportExport');

// Import test helpers after mocking
import {
  createTestContext,
  expectSuccessResponse,
  expectAuthError,
  TEST_USERS,
} from '@/__tests__/auth-session-test-helpers';

// Helper functions for this test file
const createRequestWithAuth = (
  path: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  userInfo?: Partial<ServerUserInfo>
): NextRequest => {
  // Setup auth mock
  const testUser = {
    userId: 'free-user-123',
    email: 'free@example.com',
    subscriptionTier: 'free' as const,
    ...userInfo,
  };
  mockGetServerSession.mockResolvedValue(testUser);

  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  headers.set('cookie', 'sessionId=test-session-id');

  if (body && method !== 'GET') {
    headers.set('content-type', 'application/json');
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

const createUnauthenticatedRequest = (
  path: string = '/api/test',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): NextRequest => {
  // Setup unauth mock
  mockGetServerSession.mockResolvedValue(null);

  const url = `http://localhost:3000${path}`;
  const headers = new Headers();

  if (body && method !== 'GET') {
    headers.set('content-type', 'application/json');
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

const testApiRouteAuth = async (
  handler: Function,
  userInfo?: Partial<ServerUserInfo>,
  requestBody?: any,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
) => {
  const request = createRequestWithAuth('/api/test', method, requestBody, userInfo);
  const context = createTestContext(params);

  const response = await handler(request, context);
  const data = await response.json();

  return { response, data };
};

const testApiRouteUnauth = async (
  handler: Function,
  requestBody?: any,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
) => {
  const request = createUnauthenticatedRequest('/api/test', method, requestBody);
  const context = createTestContext(params);

  const response = await handler(request, context);
  const data = await response.json();

  return { response, data };
};

const mockService = EncounterServiceImportExport as jest.Mocked<typeof EncounterServiceImportExport>;


describe('/api/encounters/import', () => {
  const testUserId = 'free-user-123';

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockClear();
  });

  describe('POST /api/encounters/import', () => {
    it('should import encounter from JSON successfully', async () => {
      mockService.importFromJson.mockResolvedValue(
        mockApiResponses.success(mockEncounter)
      );

      const requestBody = {
        data: JSON.stringify(mockImportData),
        format: 'json',
        options: {
          createMissingCharacters: true,
          preserveIds: false,
          overwriteExisting: false,
        },
      };

      const { response, data } = await testApiRouteAuth(
        POST,
        { userId: testUserId, email: 'free@example.com', subscriptionTier: 'free' },
        requestBody,
        undefined,
        'POST'
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
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
        format: 'xml',
        options: {
          createMissingCharacters: true,
        },
      };

      const { response, data } = await testApiRouteAuth(
        POST,
        { userId: testUserId, email: 'free@example.com', subscriptionTier: 'free' },
        requestBody,
        undefined,
        'POST'
      );

      expectSuccessResponse(response);
      expect(data.success).toBe(true);
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
        format: 'json',
      };

      await testApiRouteAuth(
        POST,
        { userId: testUserId, email: 'free@example.com', subscriptionTier: 'free' },
        requestBody,
        undefined,
        'POST'
      );

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
      const { response } = await testApiRouteUnauth(POST, {
        data: JSON.stringify(mockImportData),
        format: 'json',
      }, undefined, 'POST');

      expectAuthError(response);
    });

    it('should handle service errors gracefully', async () => {
      mockService.importFromJson.mockRejectedValue(
        new Error('Import service failed')
      );

      const requestBody = {
        data: JSON.stringify(mockImportData),
        format: 'json',
      };

      const { response, data } = await testApiRouteAuth(
        POST,
        { userId: testUserId, email: 'free@example.com', subscriptionTier: 'free' },
        requestBody,
        undefined,
        'POST'
      );

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Import service failed');
    });
  });
});