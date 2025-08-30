/**
 * Shared Test Utilities for Encounter API Routes
 *
 * This module consolidates common test patterns and utilities used across
 * encounter API route tests to eliminate code duplication.
 */

import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@clerk/nextjs/server';
import { EncounterServiceImportExport } from '@/lib/services/EncounterServiceImportExport';

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Standard test user for consistent authentication testing
 */
export const TEST_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
} as const;

/**
 * Mock auth to return successful authentication
 * Uses shared factory function to eliminate code duplication
 */
export const mockAuthSuccess = (mockAuth: jest.MockedFunction<typeof auth>) => {
  mockAuth.mockResolvedValue({ userId: TEST_USER.id, publicMetadata: { role: 'user' } } as any);
};

/**
 * Mock auth to return null (unauthenticated)
 */
export const mockAuthFailure = (mockAuth: jest.MockedFunction<typeof auth>) => {
  mockAuth.mockResolvedValue({ userId: undefined } as any);
};

/**
 * Mock auth to return session without user ID
 */
export const mockAuthIncomplete = (mockAuth: jest.MockedFunction<typeof auth>) => {
  mockAuth.mockResolvedValue({
    user: {
      email: TEST_USER.email,
      // Missing ID
    },
  } as any);
};

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Creates a mock import data structure for JSON import testing
 */
export const createMockImportData = (overrides: any = {}) => ({
  metadata: {
    exportedAt: new Date().toISOString(),
    exportedBy: TEST_USER.id,
    format: 'json',
    version: '1.0.0',
    appVersion: '1.0.0',
    ...overrides.metadata,
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
    ...overrides.encounter,
  },
});

/**
 * Creates a mock encounter for test responses
 */
export const createMockEncounter = (overrides: any = {}) => ({
  _id: new Types.ObjectId(),
  name: 'Imported Encounter',
  description: 'Test import',
  participants: [{ name: 'Test Character' }],
  ownerId: TEST_USER.id,
  ...overrides,
});

/**
 * Creates standard XML data for testing
 */
export const createMockXmlData = () =>
  '<encounter><name>Test XML Encounter</name><description>XML import test</description></encounter>';

/**
 * Creates backup data structure for restore operations
 */
export const createMockBackupData = (encounterCount: number = 1) => ({
  metadata: {
    backupDate: new Date().toISOString(),
    userId: TEST_USER.id,
    encounterCount,
    format: 'json',
  },
  encounters: Array.from({ length: encounterCount }, (_, index) =>
    createMockImportData({
      encounter: {
        name: `Encounter ${index + 1}`,
        description: `Backup encounter ${index + 1}`,
      },
    })
  ),
});

// ============================================================================
// REQUEST BUILDERS
// ============================================================================

/**
 * Creates a mock NextRequest for import/export operations
 */
export const createMockRequest = (config: {
  body?: any;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
} = {}): NextRequest => {
  const {
    body,
    method = 'POST',
    url = 'http://localhost:3000/api/encounters/import',
    headers = { 'Content-Type': 'application/json' },
  } = config;

  return {
    json: jest.fn().mockResolvedValue(body || {}),
    method,
    headers: new Headers(headers),
    url,
  } as unknown as NextRequest;
};

/**
 * Creates request body for import operations
 */
export const createImportRequestBody = (
  data: string,
  format: 'json' | 'xml' = 'json',
  options: any = null
) => ({
  data,
  format,
  ...(options !== null && { options }),
});

/**
 * Creates request body for restore operations
 */
export const createRestoreRequestBody = (
  backupData: string,
  format: 'json' | 'xml' = 'json',
  options: any = {}
) => ({
  backupData,
  format,
  options: {
    preserveIds: false,
    createMissingCharacters: true,
    overwriteExisting: false,
    ...options,
  },
});

/**
 * Creates request with invalid JSON to test error handling
 */
export const createInvalidJsonRequest = (): NextRequest => {
  const request = createMockRequest({
    method: 'POST',
    body: undefined, // Will cause JSON parsing to fail
  });

  // Override json method to throw error
  request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

  return request;
};

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

/**
 * Creates default import options with user ID
 */
export const createDefaultImportOptions = (overrides: any = {}) => ({
  ownerId: TEST_USER.id,
  preserveIds: false,
  createMissingCharacters: true,
  overwriteExisting: false,
  ...overrides,
});

/**
 * Creates default export options
 */
export const createDefaultExportOptions = (overrides: any = {}) => ({
  includeCharacterSheets: false,
  includePrivateNotes: false,
  includeIds: false,
  stripPersonalData: false,
  ...overrides,
});

// ============================================================================
// SERVICE MOCKING UTILITIES
// ============================================================================

/**
 * Mock import service to return success
 */
export const mockImportSuccess = (
  mockService: jest.Mocked<typeof EncounterServiceImportExport>,
  encounter: any = createMockEncounter()
) => {
  mockService.importFromJson.mockResolvedValue({
    success: true,
    data: encounter,
  });
  mockService.importFromXml.mockResolvedValue({
    success: true,
    data: encounter,
  });
};

/**
 * Mock import service to return failure
 */
export const mockImportFailure = (
  mockService: jest.Mocked<typeof EncounterServiceImportExport>,
  error: { message: string; code?: string; details?: string } = {
    message: 'Import failed',
    code: 'IMPORT_ERROR',
  }
) => {
  mockService.importFromJson.mockResolvedValue({
    success: false,
    error,
  });
  mockService.importFromXml.mockResolvedValue({
    success: false,
    error,
  });
};

/**
 * Mock export service to return success
 */
export const mockExportSuccess = (
  mockService: jest.Mocked<typeof EncounterServiceImportExport>,
  data: string = '{"test": "data"}'
) => {
  mockService.exportToJson.mockResolvedValue({
    success: true,
    data,
  });
  mockService.exportToXml.mockResolvedValue({
    success: true,
    data: '<?xml version="1.0"?><test>data</test>',
  });
};

/**
 * Mock export service to return failure
 */
export const mockExportFailure = (
  mockService: jest.Mocked<typeof EncounterServiceImportExport>,
  error: { message: string; code?: string } = {
    message: 'Export failed',
    code: 'EXPORT_ERROR',
  }
) => {
  mockService.exportToJson.mockResolvedValue({
    success: false,
    error,
  });
  mockService.exportToXml.mockResolvedValue({
    success: false,
    error,
  });
};

/**
 * Mock service to throw exceptions
 */
export const mockServiceException = (
  mockService: jest.Mocked<typeof EncounterServiceImportExport>,
  errorMessage: string = 'Service error'
) => {
  const error = new Error(errorMessage);
  mockService.importFromJson.mockRejectedValue(error);
  mockService.importFromXml.mockRejectedValue(error);
  mockService.exportToJson.mockRejectedValue(error);
  mockService.exportToXml.mockRejectedValue(error);
};

// ============================================================================
// RESPONSE ASSERTION UTILITIES
// ============================================================================

/**
 * Standard success response assertions for import operations
 */
export const expectImportSuccess = async (
  response: Response,
  expectedName: string = 'Imported Encounter',
  expectedParticipantCount: number = 1
) => {
  expect(response.status).toBe(200);
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  expect(responseData.encounter.name).toBe(expectedName);
  expect(responseData.encounter.participantCount).toBe(expectedParticipantCount);
  return responseData;
};

/**
 * Standard error response assertions
 */
export const expectErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedError: string,
  expectedDetails?: string
) => {
  expect(response.status).toBe(expectedStatus);
  const responseData = await response.json();
  expect(responseData.error).toBe(expectedError);
  if (expectedDetails) {
    expect(responseData.details).toBe(expectedDetails);
  }
  return responseData;
};

/**
 * Standard authentication error assertion
 */
export const expectAuthenticationError = async (response: Response) => {
  expect(response.status).toBe(401);
  const responseData = await response.json();
  expect(responseData.error || responseData.message).toBe('Authentication required');
  expect(responseData.success).toBe(false);
  return responseData;
};

/**
 * Standard validation error assertion
 */
export const expectValidationError = async (
  response: Response,
  expectedField?: string
) => {
  expect(response.status).toBe(400);
  const responseData = await response.json();
  expect(responseData.error).toBe('Invalid request data');
  if (expectedField) {
    expect(responseData.details).toContain(expectedField);
  }
  return responseData;
};

/**
 * Standard server error assertion
 */
export const expectServerError = async (response: Response) => {
  return expectErrorResponse(response, 500, 'Internal server error');
};

/**
 * Export success response assertions
 */
export const expectExportSuccess = async (
  response: Response,
  expectedFormat: 'json' | 'xml' = 'json'
) => {
  expect(response.status).toBe(200);

  const contentType = response.headers.get('Content-Type');
  if (expectedFormat === 'json') {
    expect(contentType).toBe('application/json');
  } else {
    expect(contentType).toBe('application/xml');
  }

  expect(response.headers.get('Content-Disposition')).toContain('attachment');
  expect(response.headers.get('Content-Disposition')).toContain(`.${expectedFormat}`);

  const responseData = await response.text();
  expect(responseData).toBeTruthy();
  return responseData;
};

/**
 * Restore success response assertions
 */
export const expectRestoreSuccess = async (
  response: Response,
  expectedRestoredCount: number = 1
) => {
  expect(response.status).toBe(200);
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  expect(responseData.summary.successfullyRestored).toBe(expectedRestoredCount);
  return responseData;
};

// ============================================================================
// TEST EXECUTION HELPERS
// ============================================================================

/**
 * Standard test setup for all encounter API tests
 */
export const setupEncounterApiTest = () => {
  jest.clearAllMocks();

  // Return mock functions for common use
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockService = EncounterServiceImportExport as jest.Mocked<typeof EncounterServiceImportExport>;

  // Default to successful authentication
  mockAuthSuccess(mockAuth);

  return {
    mockAuth,
    mockService,
  };
};

/**
 * Execute a test with standard authentication failure scenario
 */
export const testAuthenticationRequired = async (
  handler: Function,
  requestBody: any = {},
  method: string = 'POST'
) => {
  const { mockAuth } = setupEncounterApiTest();
  mockAuthFailure(mockAuth);

  const request = createMockRequest({ body: requestBody, method });
  const response = await handler(request);

  await expectAuthenticationError(response);
  return response;
};

/**
 * Execute a test with validation error scenario
 */
export const testValidationError = async (
  handler: Function,
  invalidBody: any,
  expectedField?: string
) => {
  setupEncounterApiTest();

  const request = createMockRequest({ body: invalidBody });
  const response = await handler(request);

  await expectValidationError(response, expectedField);
  return response;
};

/**
 * Execute a test with service exception scenario
 */
export const testServiceException = async (
  handler: Function,
  requestBody: any = {},
  errorMessage: string = 'Service error'
) => {
  const { mockService } = setupEncounterApiTest();
  mockServiceException(mockService, errorMessage);

  const request = createMockRequest({ body: requestBody });
  const response = await handler(request);

  await expectServerError(response);
  return response;
};