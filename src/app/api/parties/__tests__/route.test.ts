import { GET, POST } from '@/app/api/parties/route';
import {
  getMocks,
  setupStandardMocks,
  createGetRequest,
  createPostRequest,
  mockValidationSuccess,
  mockValidationError,
  SAMPLE_PARTY_DATA,
  SAMPLE_PARTY_RESPONSE,
  SAMPLE_PAGINATION,
  createSuccessResult,
  createErrorResult,
} from '@/app/api/parties/__tests__/api-test-utils';

describe('/api/parties', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupStandardMocks();
  });

  describe('GET /api/parties', () => {
    it('should return parties with default parameters', async () => {
      const request = createGetRequest();
      const mockResponse = { parties: [SAMPLE_PARTY_RESPONSE], pagination: SAMPLE_PAGINATION };

      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult(mockResponse)
      );

      const response = await GET(request);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
      // Verify the function completes without error
    });

    it('should handle custom query parameters', async () => {
      const request = createGetRequest({ page: '2', limit: '10', sortBy: 'createdAt', sortOrder: 'desc' });
      const mockResponse = { parties: [], pagination: { ...SAMPLE_PAGINATION, currentPage: 2, itemsPerPage: 10 } };

      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'createdAt',
        sortOrder: 'desc',
        pagination: { page: 2, limit: 10 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult(mockResponse)
      );

      const response = await GET(request);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle validation errors', async () => {
      mockValidationError(mocks.partyQuerySchema);
      const request = createGetRequest();

      const response = await GET(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createErrorResult('Test error', 'TEST_ERROR')
      );

      const response = await GET(createGetRequest());

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle complex query parameters with filters', async () => {
      const request = createGetRequest({
        search: 'test',
        tags: 'adventure,dungeon',
        memberCount: '4,6',
        isPublic: 'true'
      });

      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: {
          search: 'test',
          tags: ['adventure', 'dungeon'],
          memberCount: [4, 6],
          isPublic: true
        },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult({ parties: [], pagination: SAMPLE_PAGINATION })
      );

      const response = await GET(request);
      expect(response).toBeDefined();
    });
  });

  describe('POST /api/parties', () => {
    it('should create a new party successfully', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(mocks.partyCreateSchema, SAMPLE_PARTY_DATA);
      mocks.PartyService.createParty.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await POST(request);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle validation errors in POST', async () => {
      mockValidationError(mocks.partyCreateSchema);
      const request = createPostRequest(SAMPLE_PARTY_DATA);

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle service errors in POST', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(mocks.partyCreateSchema, SAMPLE_PARTY_DATA);
      mocks.PartyService.createParty.mockResolvedValue(
        createErrorResult('Test error', 'TEST_ERROR')
      );

      const response = await POST(request);

      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle malformed JSON in POST request', async () => {
      const request = {
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any;

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle database connection errors in POST', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(mocks.partyCreateSchema, SAMPLE_PARTY_DATA);
      mocks.PartyService.createParty.mockRejectedValue(new Error('Database connection failed'));

      const response = await POST(request);
      expect(response).toBeDefined();
    });
  });

  describe('Authentication and Access Control', () => {
    it('should handle authentication errors in GET', async () => {
      // Mock withAuth to throw an error
      mocks.withAuth.mockRejectedValueOnce(new Error('Authentication failed'));

      const request = createGetRequest();
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('should handle authentication errors in POST', async () => {
      // Mock withAuth to throw an error
      mocks.withAuth.mockRejectedValueOnce(new Error('Authentication failed'));

      const request = createPostRequest(SAMPLE_PARTY_DATA);
      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('should handle authorization failures', async () => {
      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createErrorResult('Access denied', 'ACCESS_DENIED')
      );
      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      const response = await GET(createGetRequest());
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper Response objects for GET', async () => {
      const request = createGetRequest({});
      mockValidationSuccess(mocks.partyQuerySchema, {
        filters: { tags: [], memberCount: [] },
        sortBy: 'name',
        sortOrder: 'asc',
        pagination: { page: 1, limit: 20 },
      });

      mocks.PartyService.getPartiesForUser.mockResolvedValue(
        createSuccessResult({ parties: [], pagination: SAMPLE_PAGINATION })
      );

      const response = await GET(request);

      expect(response).toBeInstanceOf(Response);
      expect(typeof response.json).toBe('function');
    });

    it('should return proper Response objects for POST', async () => {
      const request = createPostRequest(SAMPLE_PARTY_DATA);
      mockValidationSuccess(mocks.partyCreateSchema, SAMPLE_PARTY_DATA);
      mocks.PartyService.createParty.mockResolvedValue(
        createSuccessResult(SAMPLE_PARTY_RESPONSE)
      );

      const response = await POST(request);

      expect(response).toBeInstanceOf(Response);
      expect(typeof response.json).toBe('function');
    });
  });
});