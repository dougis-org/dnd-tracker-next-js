import { CharacterService } from '@/lib/services/CharacterService';
import {
  TEST_USER_ID,
  TEST_CHARACTER_ID,
  createMockRequest,
  createTestCharacter,
  expectErrorResponse,
  createMockParams,
} from './test-helpers';
import {
  expectSuccessResponse,
  setupClerkMocks,
  setupUnauthenticatedState,
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock service utilities
export const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

// Common mock response patterns
const createSuccessResponse = (data: any) => ({ success: true, data });
const createErrorResponse = (error: any) => ({ success: false, error });
const createPaginatedResponse = (items: any[]) => createSuccessResponse({
  items,
  pagination: { page: 1, limit: 50, total: items.length, totalPages: 1 }
});

// Common test setup
export const setupSuccessfulGetCharacters = (characters: any[] = []) => {
  mockCharacterService.getCharactersByOwner.mockResolvedValue(createPaginatedResponse(characters));
};

export const setupSuccessfulCharacterById = (character: any) => {
  mockCharacterService.getCharacterById.mockResolvedValue(createSuccessResponse(character));
};

export const setupSuccessfulCharacterUpdate = (character: any) => {
  mockCharacterService.updateCharacter.mockResolvedValue(createSuccessResponse(character));
};

export const setupSuccessfulCharacterCreate = (character: any) => {
  mockCharacterService.createCharacter.mockResolvedValue(createSuccessResponse(character));
};

export const setupSuccessfulCharacterDelete = () => {
  mockCharacterService.deleteCharacter.mockResolvedValue(createSuccessResponse(undefined));
};

export const setupSuccessfulCharactersByType = (characters: any[]) => {
  mockCharacterService.getCharactersByType.mockResolvedValue(createSuccessResponse(characters));
};

export const setupCharacterNotFound = () => {
  const notFoundError = { code: 'CHARACTER_NOT_FOUND', message: 'Character not found' };
  const errorResponse = createErrorResponse(notFoundError);
  mockCharacterService.getCharacterById.mockResolvedValue(errorResponse);
  mockCharacterService.updateCharacter.mockResolvedValue(errorResponse);
  mockCharacterService.deleteCharacter.mockResolvedValue(errorResponse);
};

export const setupAccessDeniedError = () => {
  const accessError = new Error('access denied');
  mockCharacterService.getCharacterById.mockRejectedValue(accessError);
  mockCharacterService.updateCharacter.mockRejectedValue(accessError);
  mockCharacterService.deleteCharacter.mockRejectedValue(accessError);
};

// Common request creators (NextAuth compatible)
export const createAuthenticatedRequest = (
  url: string,
  options: any = {},
  mockAuth?: jest.MockedFunction<any>
) => {
  // Setup NextAuth mock - required for character API routes
  if (mockAuth) {
    setupClerkMocks(mockAuth, undefined, TEST_USER_ID);
  }

  // Character API routes now use NextAuth session validation
  return createMockRequest(url, options);
};

export const createUnauthenticatedRequest = (
  url: string,
  options: any = {},
  mockAuth?: jest.MockedFunction<any>
) => {
  // Setup unauthenticated mock if provided
  if (mockAuth) {
    setupUnauthenticatedState(mockAuth);
  }

  return createMockRequest(url, options);
};

export const createCharacterRequest = (overrides: any = {}, mockAuth?: jest.MockedFunction<any>) => {
  return createAuthenticatedRequest(`http://localhost:3000/api/characters/${TEST_CHARACTER_ID}`, overrides, mockAuth);
};

export const createCharacterListRequest = (queryParams: string = '', mockAuth?: jest.MockedFunction<any>) => {
  return createAuthenticatedRequest(`http://localhost:3000/api/characters${queryParams}`, {}, mockAuth);
};

// Common test execution patterns
export const createMockParamsObject = () => ({ params: createMockParams() });

export const executeApiTest = async (
  apiFunction: Function,
  request: any,
  paramsObject: any = createMockParamsObject()
) => {
  return await apiFunction(request, paramsObject);
};

// Common test data creators
export const createTestCharacters = () => [
  createTestCharacter({ name: 'Test Character 1' }),
  createTestCharacter({ name: 'Test Character 2', type: 'npc' }),
];

export const createUpdateData = () => ({
  name: 'Updated Name',
  hitPoints: { maximum: 19, current: 19, temporary: 0 }
});

// Common assertion patterns
export const expectSuccessfulResponse = async (response: Response, expectedData?: any) => {
  if (expectedData) {
    return expectSuccessResponse(response, { data: expectedData });
  } else {
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    return data;
  }
};

export const expectSuccessfulCreation = async (response: Response, expectedData?: any) => {
  const data = await response.json();
  expect(response.status).toBe(201);
  expect(data.success).toBe(true);
  if (expectedData) {
    expect(data.data).toEqual(expect.objectContaining(expectedData));
  }
  return data;
};

// Common test patterns (NextAuth compatible)
export const runAuthenticationTest = async (
  apiFunction: Function,
  mockAuth?: jest.MockedFunction<any>,
  ...args: any[]
) => {
  const request = createUnauthenticatedRequest('http://localhost:3000/api/test', {}, mockAuth);
  const response = await apiFunction(request, ...args);
  await expectErrorResponse(response, 401, 'Authentication required');
};

const runErrorTest = async (
  apiFunction: Function,
  setupMock: Function,
  mockAuth: jest.MockedFunction<any> | undefined,
  status: number,
  message: string,
  ...args: any[]
) => {
  setupMock();
  const request = createAuthenticatedRequest('http://localhost:3000/api/test', {}, mockAuth);
  const response = await apiFunction(request, ...args);
  await expectErrorResponse(response, status, message);
};

export const runNotFoundTest = async (
  apiFunction: Function,
  setupMock: Function,
  mockAuth?: jest.MockedFunction<any>,
  ...args: any[]
) => {
  await runErrorTest(apiFunction, setupMock, mockAuth, 404, 'Character not found', ...args);
};

export const runAccessDeniedTest = async (
  apiFunction: Function,
  setupMock: Function,
  mockAuth?: jest.MockedFunction<any>,
  ...args: any[]
) => {
  await runErrorTest(apiFunction, setupMock, mockAuth, 403, 'Access denied', ...args);
};

// Simplified test runners with standard params
export const runNotFoundTestWithParams = async (
  apiFunction: Function,
  setupMock: Function,
  mockAuth?: jest.MockedFunction<any>
) => {
  await runNotFoundTest(apiFunction, setupMock, mockAuth, createMockParamsObject());
};

export const runAccessDeniedTestWithParams = async (
  apiFunction: Function,
  setupMock: Function,
  mockAuth?: jest.MockedFunction<any>
) => {
  await runAccessDeniedTest(apiFunction, setupMock, mockAuth, createMockParamsObject());
};

export const runAuthenticationTestWithParams = async (
  apiFunction: Function,
  mockAuth?: jest.MockedFunction<any>
) => {
  await runAuthenticationTest(apiFunction, mockAuth, createMockParamsObject());
};