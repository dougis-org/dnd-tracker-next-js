import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import { PartyService } from '@/lib/services/PartyService';
import { withAuth, createSuccessResponse, handleServiceError } from '@/lib/api/route-helpers';
import { partyUpdateSchema } from '@/lib/validations/party';

// Mock the dependencies
jest.mock('@/lib/services/PartyService');
jest.mock('@/lib/api/route-helpers');
jest.mock('@/lib/validations/party');

const MockedPartyService = PartyService as jest.Mocked<typeof PartyService>;
const MockedWithAuth = withAuth as jest.MockedFunction<typeof withAuth>;
const MockedCreateSuccessResponse = createSuccessResponse as jest.MockedFunction<typeof createSuccessResponse>;
const MockedHandleServiceError = handleServiceError as jest.MockedFunction<typeof handleServiceError>;
const MockedPartyUpdateSchema = partyUpdateSchema as jest.Mocked<typeof partyUpdateSchema>;

describe('/api/parties/[id]', () => {
  const userId = '507f1f77bcf86cd799439011';
  const partyId = '507f1f77bcf86cd799439012';

  const mockPartyResponse = {
    id: partyId,
    ownerId: userId,
    name: 'Test Party',
    description: 'A test party',
    members: [],
    tags: ['test'],
    isPublic: false,
    sharedWith: [],
    settings: {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
    memberCount: 0,
    playerCharacterCount: 0,
    averageLevel: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock withAuth to call the callback with userId
    MockedWithAuth.mockImplementation(async (callback) => {
      return await callback(userId);
    });

    // Mock createSuccessResponse to return a proper Response object
    MockedCreateSuccessResponse.mockImplementation((data, message) => {
      const responseBody = {
        success: true,
        ...(message && { message }),
        ...data,
      };
      return {
        json: async () => responseBody,
        status: 200,
      } as any;
    });

    // Mock handleServiceError to return a proper Response object
    MockedHandleServiceError.mockImplementation((result, defaultMessage, defaultStatus = 400) => {
      const message = result.error?.message || defaultMessage;
      const status = result.error?.statusCode || defaultStatus;
      const responseBody = {
        success: false,
        message,
        ...(defaultStatus === 400 && { errors: result.error?.details || [{ field: '', message }] }),
      };
      return {
        json: async () => responseBody,
        status,
      } as any;
    });

    // Mock validation schemas to pass through data
    MockedPartyUpdateSchema.parse = jest.fn().mockImplementation((data) => data);
  });

  describe('GET /api/parties/[id]', () => {
    it('should get a party by ID successfully', async () => {
      const mockServiceResult = {
        success: true,
        data: mockPartyResponse,
      };

      MockedPartyService.getPartyById.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`);
      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(MockedPartyService.getPartyById).toHaveBeenCalledWith(partyId, userId);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.party).toEqual(mockPartyResponse);
    });

    it('should handle party not found', async () => {
      const mockServiceResult = {
        success: false,
        error: {
          message: 'Party not found',
          code: 'PARTY_NOT_FOUND',
          statusCode: 404,
        },
      };

      MockedPartyService.getPartyById.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`);
      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Party not found');
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        error: {
          message: 'Database error',
          code: 'DB_ERROR',
          statusCode: 500,
        },
      };

      MockedPartyService.getPartyById.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`);
      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Database error');
    });
  });

  describe('PUT /api/parties/[id]', () => {
    const validUpdateData = {
      name: 'Updated Party',
      description: 'An updated party',
      tags: ['updated'],
      isPublic: true,
    };

    it('should update a party successfully', async () => {
      const mockServiceResult = {
        success: true,
        data: { ...mockPartyResponse, ...validUpdateData },
      };

      MockedPartyService.updateParty.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the update data
      jest.spyOn(request, 'json').mockResolvedValue(validUpdateData);

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(MockedPartyService.updateParty).toHaveBeenCalledWith(partyId, userId, validUpdateData);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Party updated successfully');
      expect(responseData.party).toEqual({ ...mockPartyResponse, ...validUpdateData });
    });

    it('should handle validation errors', async () => {
      const invalidUpdateData = {
        name: '', // Invalid: empty name
      };

      // Import ZodError for the mock
      const { ZodError } = require('zod');

      // Mock schema to throw validation error for this test
      MockedPartyUpdateSchema.parse = jest.fn().mockImplementation(() => {
        throw new ZodError([
          {
            code: 'too_small',
            minimum: 1,
            type: 'string',
            inclusive: true,
            message: 'Party name is required',
            path: ['name'],
          },
        ]);
      });

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the invalid data
      jest.spyOn(request, 'json').mockResolvedValue(invalidUpdateData);

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid party data');
      expect(responseData.errors).toBeDefined();
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        error: {
          message: 'Party not found',
          code: 'PARTY_NOT_FOUND',
          statusCode: 404,
        },
      };

      MockedPartyService.updateParty.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the valid data
      jest.spyOn(request, 'json').mockResolvedValue(validUpdateData);

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Party not found');
    });

    it('should handle malformed JSON', async () => {
      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to throw an error for malformed JSON
      jest.spyOn(request, 'json').mockRejectedValue(new Error('Unexpected token i in JSON at position 0'));

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Internal server error');
    });
  });

  describe('DELETE /api/parties/[id]', () => {
    it('should delete a party successfully', async () => {
      const mockServiceResult = {
        success: true,
        data: undefined,
      };

      MockedPartyService.deleteParty.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const responseData = await response.json();

      expect(MockedPartyService.deleteParty).toHaveBeenCalledWith(partyId, userId);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Party deleted successfully');
    });

    it('should handle party not found', async () => {
      const mockServiceResult = {
        success: false,
        error: {
          message: 'Party not found',
          code: 'PARTY_NOT_FOUND',
          statusCode: 404,
        },
      };

      MockedPartyService.deleteParty.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Party not found');
    });

    it('should handle service errors', async () => {
      const mockServiceResult = {
        success: false,
        error: {
          message: 'Database error',
          code: 'DB_ERROR',
          statusCode: 500,
        },
      };

      MockedPartyService.deleteParty.mockResolvedValue(mockServiceResult);

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Database error');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for GET', async () => {
      MockedWithAuth.mockImplementation(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
          status: 401,
        });
      });

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`);
      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should require authentication for PUT', async () => {
      MockedWithAuth.mockImplementation(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
          status: 401,
        });
      });

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const response = await PUT(request, { params });

      expect(response.status).toBe(401);
    });

    it('should require authentication for DELETE', async () => {
      MockedWithAuth.mockImplementation(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
          status: 401,
        });
      });

      const params = Promise.resolve({ id: partyId });
      const request = new NextRequest(`http://localhost/api/parties/${partyId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(401);
    });
  });
});