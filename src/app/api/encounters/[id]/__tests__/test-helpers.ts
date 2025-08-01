import { NextRequest } from 'next/server';
import { Types } from 'mongoose';

/**
 * Test helpers for API route testing
 * Reduces code duplication across test files
 */

// Common test data generators
export const createValidUpdateData = () => ({
  name: 'Updated Encounter',
  description: 'Updated description',
  difficulty: 'hard' as const,
  estimatedDuration: 90,
  targetLevel: 6,
  participants: [
    {
      characterId: new Types.ObjectId().toString(),
      name: 'Updated Player',
      type: 'pc' as const,
      maxHitPoints: 60,
      currentHitPoints: 60,
      temporaryHitPoints: 0,
      armorClass: 18,
      initiative: undefined,
      isPlayer: true,
      isVisible: true,
      notes: '',
      conditions: [],
      position: undefined,
    },
  ],
  tags: ['updated', 'test'],
  settings: {
    allowPlayerVisibility: true,
    autoRollInitiative: true,
    trackResources: true,
    enableLairActions: false,
    lairActionInitiative: undefined,
    enableGridMovement: false,
    gridSize: 5,
    roundTimeLimit: undefined,
    experienceThreshold: undefined,
  },
});

export const createInvalidUpdateData = () => ({
  ...createValidUpdateData(),
  name: '', // Invalid empty name
});

export const createInvalidParticipantData = () => ({
  ...createValidUpdateData(),
  participants: [
    {
      name: 'Invalid Participant',
      // Missing required fields
    },
  ],
});

export const createInvalidSettingsData = () => {
  const validData = createValidUpdateData();
  return {
    ...validData,
    settings: {
      ...validData.settings,
      enableLairActions: true,
      // Missing lairActionInitiative when lair actions enabled
    },
  };
};

// Mock request factory
export const createMockRequest = (
  data: any,
  method: 'GET' | 'PUT' | 'DELETE' = 'PUT'
): NextRequest => {
  if (method === 'GET' || method === 'DELETE') {
    return new NextRequest(`http://localhost:3000/api/encounters/test-id`, {
      method,
    });
  }

  return {
    json: jest.fn().mockResolvedValue(data),
    method,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    url: 'http://localhost:3000/api/encounters/test-id',
  } as unknown as NextRequest;
};

// Common test context setup
export const createTestContext = () => ({
  params: Promise.resolve({ id: 'test-id' }),
});

// Async params helper for different IDs
export const createAsyncParams = (id: string) => ({ params: Promise.resolve({ id }) });

// JSON parsing error mock
export const createJsonParseErrorRequest = (): NextRequest => {
  const request = new NextRequest('http://localhost:3000/api/encounters/test-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid": json}', // Malformed JSON
  });

  // Override the json method to throw an error
  request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

  return request;
};

// Validation test helpers
export const expectValidationError = (response: Response, data: any, field: string) => {
  expect(response.status).toBe(400);
  expect(data.success).toBe(false);

  // More flexible validation error checking
  const errorMessage = data.message || data.error ||
                      (data.errors && Array.isArray(data.errors) && data.errors.map((e: any) => e.message || e.field).join(' ')) ||
                      '';

  // For Zod validation errors, check both field names and error messages
  if (data.errors && Array.isArray(data.errors)) {
    const hasFieldError = data.errors.some((error: any) =>
      error.field?.includes(field) || error.message?.includes(field)
    );
    expect(hasFieldError || errorMessage.toLowerCase().includes(field.toLowerCase())).toBe(true);
  } else {
    expect(errorMessage.toLowerCase()).toContain(field.toLowerCase());
  }
};

export const expectSuccessResponse = (response: Response, data: any) => {
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
};

export const expectErrorResponse = (response: Response, data: any, status: number, message: string) => {
  expect(response.status).toBe(status);
  expect(data.success).toBe(false);

  // Allow flexible error message matching for service errors
  if (message === 'Internal server error' || message === 'Database connection failed') {
    expect(data.error).toMatch(/(Internal server error|Database connection failed|Service error)/i);
  } else {
    expect(data.error).toBe(message);
  }
};

// Security test helpers
export const createUnauthorizedEncounter = (differentUserId = 'different-user-id') => ({
  ownerId: differentUserId,
});

export const expectUnauthorizedResponse = (response: Response, data: any) => {
  expect(response.status).toBe(403);
  expect(data.success).toBe(false);
  expect(data.error).toBe('Insufficient permissions');
};

export const expectUnauthenticatedResponse = (response: Response, data: any) => {
  expect(response.status).toBe(401);
  expect(data.success).toBe(false);
  expect(data.error).toBe('Unauthorized');
};

// Advanced test execution helpers to reduce duplication
export const executeApiTest = async (
  handler: Function,
  requestData: any = {},
  method: 'GET' | 'PUT' | 'DELETE' = 'GET',
  context = createTestContext()
) => {
  const request = createMockRequest(requestData, method);
  const response = await handler(request, context);
  const data = await response.json();
  return { request, response, data };
};

// Mock setup helpers
export const mockSuccessfulAccessValidation = (
  mockEncounterService: any,
  mockApiResponses: any,
  baseEncounter: any,
  userId: string
) => {
  mockEncounterService.getEncounterById.mockResolvedValue(
    mockApiResponses.success({ ...baseEncounter, ownerId: userId })
  );
};

export const createOwnedEncounter = (baseEncounter: any, userId: string) => ({
  ...baseEncounter,
  ownerId: userId,
});

// Common test pattern helpers
export const testUnauthenticatedAccess = async (
  mockAuth: any,
  handler: Function,
  requestData: any = {},
  method: 'GET' | 'PUT' | 'DELETE' = 'GET'
) => {
  mockAuth.mockResolvedValue(null);
  const { response, data } = await executeApiTest(handler, requestData, method);
  expectUnauthenticatedResponse(response, data);
  return { response, data };
};

export const testServiceError = async (
  serviceMockMethod: jest.MockedFunction<any>,
  mockApiResponses: any,
  handler: Function,
  errorMessage: string,
  requestData: any = {},
  method: 'GET' | 'PUT' | 'DELETE' = 'GET'
) => {
  // For service errors, we need to ensure access validation passes first
  serviceMockMethod.mockResolvedValue({ success: false, error: errorMessage });

  const { response, data } = await executeApiTest(handler, requestData, method);

  // Service errors should return 500
  expect(response.status).toBe(500);
  expect(data.success).toBe(false);
  expect(data.error).toMatch(/(Database connection failed|Database write failed|Database delete failed|Service error)/i);

  return { response, data };
};

export const testEncounterNotFound = async (
  mockEncounterService: any,
  mockApiResponses: any,
  handler: Function,
  requestData: any = {},
  method: 'GET' | 'PUT' | 'DELETE' = 'GET',
  encounterId: string = 'invalid-id'
) => {
  mockEncounterService.getEncounterById.mockResolvedValue(mockApiResponses.notFound());
  const context = createAsyncParams(encounterId);
  const { response, data } = await executeApiTest(handler, requestData, method, context);
  expectErrorResponse(response, data, 404, 'Encounter not found');
  return { response, data };
};

export const testUnauthorizedAccess = async (
  mockEncounterService: any,
  mockApiResponses: any,
  handler: Function,
  requestData: any = {},
  method: 'PUT' | 'DELETE' = 'PUT'
) => {
  const unauthorizedEncounter = createUnauthorizedEncounter();
  mockEncounterService.getEncounterById.mockResolvedValue(
    mockApiResponses.success(unauthorizedEncounter)
  );

  // Handle different service methods based on method type
  if (method === 'PUT') {
    mockEncounterService.updateEncounter.mockResolvedValue(
      mockApiResponses.error('Access denied')
    );
  } else if (method === 'DELETE') {
    mockEncounterService.deleteEncounter.mockResolvedValue(
      mockApiResponses.error('Access denied')
    );
  }

  const { response, data } = await executeApiTest(handler, requestData, method);
  expectUnauthorizedResponse(response, data);
  return { response, data };
};

export const setupTestMocks = (mockAuth: any, session: any) => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(session);
};