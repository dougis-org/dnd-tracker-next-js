import { NextRequest } from 'next/server';
import { withCombatValidation } from '../api-wrapper';
import { auth } from '@clerk/nextjs/server';
import { validateAndGetEncounter, validateCombatActive, validateRequiredFields, createSuccessResponse } from '../utils';
import { setupAuthenticatedState, setupUnauthenticatedState, setupIncompleteAuthState } from '@/lib/test-utils/auth-test-utils';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('../utils');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockValidateAndGetEncounter = validateAndGetEncounter as jest.MockedFunction<typeof validateAndGetEncounter>;
const mockValidateCombatActive = validateCombatActive as jest.MockedFunction<typeof validateCombatActive>;
const mockValidateRequiredFields = validateRequiredFields as jest.MockedFunction<typeof validateRequiredFields>;
const mockCreateSuccessResponse = createSuccessResponse as jest.MockedFunction<typeof createSuccessResponse>;

// Test data configurations - data-driven approach
const testConfigurations = {
  unauthenticated: {
    setupAuth: () => setupUnauthenticatedState(mockAuth),
    expectedStatus: 401,
    expectedMessage: 'Authentication required'
  },
  missingUserId: {
    setupAuth: () => setupIncompleteAuthState(mockAuth),
    expectedStatus: 401,
    expectedMessage: 'Authentication required'
  },
  wrongOwner: {
    setupAuth: () => setupAuthenticatedState(mockAuth, 'user123'),
    encounterOwner: 'different-user',
    expectedStatus: 403,
    expectedMessage: 'Access denied: You do not own this encounter'
  }
};

// Helper to create mock encounter - centralized
function createMockEncounter(overrides: any = {}) {
  return {
    _id: 'encounter123',
    name: 'Test Encounter',
    ownerId: 'user123',
    combatState: { isActive: true },
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  };
}

describe('withCombatValidation', () => {
  let mockRequest: NextRequest;
  let mockParams: { params: Promise<{ id: string }> };
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/encounters/123/combat/test');
    mockParams = { params: Promise.resolve({ id: 'encounter123' }) };
    mockHandler = jest.fn();
  });

  describe('Authentication', () => {
    // Data-driven authentication tests
    ['unauthenticated', 'missingUserId'].forEach(configKey => {
      const config = testConfigurations[configKey as keyof typeof testConfigurations];

      it(`should return ${config.expectedStatus} when ${configKey}`, async () => {
        config.setupAuth();

        const wrappedHandler = withCombatValidation(
          { operation: 'test operation' },
          mockHandler
        );

        const response = await wrappedHandler(mockRequest, mockParams);
        const body = await response.json();

        expect(response.status).toBe(config.expectedStatus);
        expect(body).toEqual({
          success: false,
          message: config.expectedMessage
        });
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('Encounter Ownership', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockAuth, 'user123');
    });

    it('should return 403 when user does not own the encounter', async () => {
      const config = testConfigurations.wrongOwner;
      const mockEncounter = createMockEncounter({
        ownerId: config.encounterOwner,
        combatState: { isActive: true }
      });

      mockValidateAndGetEncounter.mockResolvedValue({
        encounter: mockEncounter,
        errorResponse: null
      });

      const wrappedHandler = withCombatValidation(
        { operation: 'test operation' },
        mockHandler
      );

      const response = await wrappedHandler(mockRequest, mockParams);
      const body = await response.json();

      expect(response.status).toBe(config.expectedStatus);
      expect(body).toEqual({
        success: false,
        message: config.expectedMessage
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should proceed when user owns the encounter', async () => {
      const mockEncounter = createMockEncounter({
        ownerId: 'user123',
        combatState: { isActive: true },
        save: jest.fn().mockResolvedValue(true)
      });

      const mockSuccessResponse = {
        json: () => Promise.resolve({
          success: true,
          encounter: mockEncounter
        }),
        status: 200
      };

      mockValidateAndGetEncounter.mockResolvedValue({
        encounter: mockEncounter,
        errorResponse: null
      });

      mockValidateCombatActive.mockReturnValue(null); // No error
      mockCreateSuccessResponse.mockReturnValue(mockSuccessResponse as any);
      mockHandler.mockResolvedValue(true);

      const wrappedHandler = withCombatValidation(
        { operation: 'test operation' },
        mockHandler
      );

      const response = await wrappedHandler(mockRequest, mockParams);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(mockEncounter, {}, undefined);
    });
  });

  describe('Integration with existing validations', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockAuth, 'user123');
    });

    it('should return encounter not found error when encounter does not exist', async () => {
      const errorResponse = new Response(JSON.stringify({
        success: false,
        message: 'Encounter not found'
      }), { status: 404 });

      mockValidateAndGetEncounter.mockResolvedValue({
        encounter: null,
        errorResponse: errorResponse as any
      });

      const wrappedHandler = withCombatValidation(
        { operation: 'test operation' },
        mockHandler
      );

      const response = await wrappedHandler(mockRequest, mockParams);

      expect(response.status).toBe(404);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 400 when combat is not active', async () => {
      const mockEncounter = createMockEncounter({
        ownerId: 'user123',
        combatState: { isActive: false }
      });

      const mockErrorResponse = {
        json: () => Promise.resolve({
          success: false,
          message: 'Combat is not active'
        }),
        status: 400
      };

      mockValidateAndGetEncounter.mockResolvedValue({
        encounter: mockEncounter,
        errorResponse: null
      });

      mockValidateCombatActive.mockReturnValue(mockErrorResponse as any);

      const wrappedHandler = withCombatValidation(
        { operation: 'test operation' },
        mockHandler
      );

      const response = await wrappedHandler(mockRequest, mockParams);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        message: 'Combat is not active'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Body parsing and validation', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockAuth, 'user123');
    });

    it('should validate required fields when provided', async () => {
      const reqFieldsErrorResponse = {
        json: () => Promise.resolve({
          success: false,
          message: 'Missing required fields: participantId'
        }),
        status: 400
      };

      mockValidateRequiredFields.mockReturnValue(reqFieldsErrorResponse as any);

      // Create request with missing required field
      const requestWithBody = new NextRequest('http://localhost:3000/api/encounters/123/combat/test', {
        method: 'POST',
        body: JSON.stringify({ initiative: 15 }), // missing participantId
        headers: { 'content-type': 'application/json' }
      });

      const wrappedHandler = withCombatValidation(
        {
          operation: 'test operation',
          requiredFields: ['participantId', 'initiative']
        },
        mockHandler
      );

      const response = await wrappedHandler(requestWithBody, mockParams);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        message: 'Missing required fields: participantId'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});