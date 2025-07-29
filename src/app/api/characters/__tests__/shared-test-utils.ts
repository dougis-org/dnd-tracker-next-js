import { CharacterService } from '@/lib/services/CharacterService';
import {
  TEST_USER_ID,
  TEST_CHARACTER_ID,
  createMockRequest,
  createTestCharacter,
  expectErrorResponse,
} from './test-helpers';

// Mock service utilities
export const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

// Common test setup
export const setupSuccessfulGetCharacters = (characters: any[] = []) => {
  mockCharacterService.getCharactersByOwner.mockResolvedValue({
    success: true,
    data: {
      items: characters,
      pagination: { page: 1, limit: 50, total: characters.length, totalPages: 1 }
    }
  });
};

export const setupSuccessfulCharacterById = (character: any) => {
  mockCharacterService.getCharacterById.mockResolvedValue({
    success: true,
    data: character
  });
};

export const setupSuccessfulCharacterUpdate = (character: any) => {
  mockCharacterService.updateCharacter.mockResolvedValue({
    success: true,
    data: character
  });
};

export const setupSuccessfulCharacterCreate = (character: any) => {
  mockCharacterService.createCharacter.mockResolvedValue({
    success: true,
    data: character
  });
};

export const setupSuccessfulCharacterDelete = () => {
  mockCharacterService.deleteCharacter.mockResolvedValue({
    success: true,
    data: undefined
  });
};

export const setupCharacterNotFound = () => {
  const notFoundError = { code: 'CHARACTER_NOT_FOUND', message: 'Character not found' };
  mockCharacterService.getCharacterById.mockResolvedValue({
    success: false,
    error: notFoundError
  });
  mockCharacterService.updateCharacter.mockResolvedValue({
    success: false,
    error: notFoundError
  });
  mockCharacterService.deleteCharacter.mockResolvedValue({
    success: false,
    error: notFoundError
  });
};

export const setupAccessDeniedError = () => {
  const accessError = new Error('access denied');
  mockCharacterService.getCharacterById.mockRejectedValue(accessError);
  mockCharacterService.updateCharacter.mockRejectedValue(accessError);
  mockCharacterService.deleteCharacter.mockRejectedValue(accessError);
};

// Common request creators (NextAuth compatible with header fallback)
export const createAuthenticatedRequest = (
  url: string, 
  options: any = {},
  mockAuth?: jest.MockedFunction<any>
) => {
  // Setup NextAuth mock if provided (for future API routes)
  if (mockAuth) {
    mockAuth.mockResolvedValue({
      user: {
        id: TEST_USER_ID,
        email: 'test@example.com',
        name: 'John Doe',
        subscriptionTier: 'free',
      },
      expires: '2024-12-31T23:59:59.999Z',
    });
  }
  
  // For current character API routes that still use header-based auth
  return createMockRequest(url, {
    ...options,
    headers: { 'x-user-id': TEST_USER_ID, ...options.headers }
  });
};

export const createUnauthenticatedRequest = (
  url: string, 
  options: any = {},
  mockAuth?: jest.MockedFunction<any>
) => {
  // Setup unauthenticated mock if provided
  if (mockAuth) {
    mockAuth.mockResolvedValue(null);
  }
  
  return createMockRequest(url, options);
};

export const createCharacterRequest = (overrides: any = {}) => {
  return createAuthenticatedRequest(`http://localhost:3000/api/characters/${TEST_CHARACTER_ID}`, overrides);
};

export const createCharacterListRequest = (queryParams: string = '') => {
  return createAuthenticatedRequest(`http://localhost:3000/api/characters${queryParams}`);
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
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  if (expectedData) {
    expect(data.data).toEqual(expect.objectContaining(expectedData));
  }
  return data;
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
  await expectErrorResponse(response, 401, 'Unauthorized');
};

export const runNotFoundTest = async (
  apiFunction: Function, 
  setupMock: Function, 
  mockAuth?: jest.MockedFunction<any>,
  ...args: any[]
) => {
  setupMock();
  const request = createAuthenticatedRequest('http://localhost:3000/api/test', {}, mockAuth);
  const response = await apiFunction(request, ...args);
  await expectErrorResponse(response, 404, 'Character not found');
};

export const runAccessDeniedTest = async (
  apiFunction: Function, 
  setupMock: Function, 
  mockAuth?: jest.MockedFunction<any>,
  ...args: any[]
) => {
  setupMock();
  const request = createAuthenticatedRequest('http://localhost:3000/api/test', {}, mockAuth);
  const response = await apiFunction(request, ...args);
  await expectErrorResponse(response, 403, 'Access denied');
};