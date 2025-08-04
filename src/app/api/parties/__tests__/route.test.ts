import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { PartyService } from '@/lib/services/PartyService';
import { withAuth, createSuccessResponse, handleServiceError } from '@/lib/api/route-helpers';
import { partyCreateSchema, partyQuerySchema } from '@/lib/validations/party';

// Mock the dependencies
jest.mock('@/lib/services/PartyService');
jest.mock('@/lib/api/route-helpers');
jest.mock('@/lib/validations/party');

const MockedPartyService = PartyService as jest.Mocked<typeof PartyService>;
const MockedWithAuth = withAuth as jest.MockedFunction<typeof withAuth>;
const MockedCreateSuccessResponse = createSuccessResponse as jest.MockedFunction<typeof createSuccessResponse>;
const MockedHandleServiceError = handleServiceError as jest.MockedFunction<typeof handleServiceError>;
const MockedPartyCreateSchema = partyCreateSchema as jest.Mocked<typeof partyCreateSchema>;
const MockedPartyQuerySchema = partyQuerySchema as jest.Mocked<typeof partyQuerySchema>;

describe('/api/parties', () => {
  const userId = '507f1f77bcf86cd799439011';

  const mockPartyResponse = {
    id: '507f1f77bcf86cd799439012',
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
    MockedPartyCreateSchema.parse = jest.fn().mockImplementation((data) => data);
    MockedPartyQuerySchema.parse = jest.fn().mockImplementation((data) => data);
  });

  describe('GET /api/parties', () => {
    it('should return parties with default parameters', async () => {
      const mockServiceResult = {
        success: true,
        data: {
          parties: [mockPartyResponse],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            itemsPerPage: 20,
          },
        },
      };

      MockedPartyService.getPartiesForUser.mockResolvedValue(mockServiceResult);

      const request = new NextRequest('http://localhost/api/parties');
      const response = await GET(request);
      const responseData = await response.json();

      expect(MockedPartyService.getPartiesForUser).toHaveBeenCalledWith(
        userId,
        {
          search: undefined,
          tags: [],
          memberCount: [],
          isPublic: undefined,
          ownerId: undefined,
          sharedWith: undefined,
        },
        'name',
        'asc',
        { page: 1, limit: 20 }
      );

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.parties).toEqual([mockPartyResponse]);
    });

    it('should handle query parameters correctly', async () => {
      const mockServiceResult = {
        success: true,
        data: {
          parties: [],
          pagination: {
            currentPage: 2,
            totalPages: 5,
            totalItems: 100,
            itemsPerPage: 10,
          },
        },
      };

      MockedPartyService.getPartiesForUser.mockResolvedValue(mockServiceResult);

      const queryParams = new URLSearchParams({
        search: 'adventure',
        tags: 'combat,roleplay',
        memberCount: '3,4,5',
        isPublic: 'true',
        sortBy: 'lastActivity',
        sortOrder: 'desc',
        page: '2',
        limit: '10',
      });

      const request = new NextRequest(`http://localhost/api/parties?${queryParams}`);
      const response = await GET(request);

      expect(MockedPartyService.getPartiesForUser).toHaveBeenCalledWith(
        userId,
        {
          search: 'adventure',
          tags: ['combat', 'roleplay'],
          memberCount: [3, 4, 5],
          isPublic: true,
          ownerId: undefined,
          sharedWith: undefined,
        },
        'lastActivity',
        'desc',
        { page: 2, limit: 10 }
      );

      expect(response.status).toBe(200);
    });

    it('should cap limit at 100', async () => {
      const mockServiceResult = {
        success: true,
        data: {
          parties: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 100,
          },
        },
      };

      MockedPartyService.getPartiesForUser.mockResolvedValue(mockServiceResult);

      const request = new NextRequest('http://localhost/api/parties?limit=500');
      await GET(request);

      expect(MockedPartyService.getPartiesForUser).toHaveBeenCalledWith(
        userId,
        expect.any(Object),
        expect.any(String),
        expect.any(String),
        { page: 1, limit: 100 }
      );
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

      MockedPartyService.getPartiesForUser.mockResolvedValue(mockServiceResult);

      const request = new NextRequest('http://localhost/api/parties');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Database error');
    });

    it('should handle invalid query parameters', async () => {
      // Import ZodError for the mock
      const { ZodError } = require('zod');

      // Mock schema to throw validation error for this test
      MockedPartyQuerySchema.parse = jest.fn().mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'nan',
            message: 'Expected number, received nan',
            path: ['pagination', 'page'],
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/parties?page=invalid');
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid query parameters');
    });
  });

  describe('POST /api/parties', () => {
    const validPartyData = {
      name: 'New Party',
      description: 'A new party for adventures',
      tags: ['adventure', 'combat'],
      isPublic: false,
      sharedWith: [],
      settings: {
        allowJoining: false,
        requireApproval: true,
        maxMembers: 6,
      },
    };

    it('should create a party successfully', async () => {
      const mockServiceResult = {
        success: true,
        data: mockPartyResponse,
      };

      MockedPartyService.createParty.mockResolvedValue(mockServiceResult);

      const request = new NextRequest('http://localhost/api/parties', {
        method: 'POST',
        body: JSON.stringify(validPartyData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the expected data
      jest.spyOn(request, 'json').mockResolvedValue(validPartyData);

      const response = await POST(request);
      const responseData = await response.json();

      expect(MockedPartyService.createParty).toHaveBeenCalledWith(userId, validPartyData);
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Party created successfully');
      expect(responseData.party).toEqual(mockPartyResponse);
    });

    it('should handle validation errors', async () => {
      const invalidPartyData = {
        name: '', // Invalid: empty name
        description: 'A test party',
      };

      // Import ZodError for the mock
      const { ZodError } = require('zod');

      // Mock schema to throw validation error for this test
      MockedPartyCreateSchema.parse = jest.fn().mockImplementation(() => {
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

      const request = new NextRequest('http://localhost/api/parties', {
        method: 'POST',
        body: JSON.stringify(invalidPartyData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the invalid data
      jest.spyOn(request, 'json').mockResolvedValue(invalidPartyData);

      const response = await POST(request);
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
          message: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR',
          statusCode: 500,
        },
      };

      MockedPartyService.createParty.mockResolvedValue(mockServiceResult);

      const request = new NextRequest('http://localhost/api/parties', {
        method: 'POST',
        body: JSON.stringify(validPartyData),
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to return the valid data
      jest.spyOn(request, 'json').mockResolvedValue(validPartyData);

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Database connection failed');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/parties', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      // Mock request.json() to throw an error for malformed JSON
      jest.spyOn(request, 'json').mockRejectedValue(new Error('Unexpected token i in JSON at position 0'));

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Internal server error');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for GET', async () => {
      MockedWithAuth.mockImplementation(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
          status: 401,
        });
      });

      const request = new NextRequest('http://localhost/api/parties');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should require authentication for POST', async () => {
      MockedWithAuth.mockImplementation(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
          status: 401,
        });
      });

      const request = new NextRequest('http://localhost/api/parties', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});